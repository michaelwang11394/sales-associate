import { LATEST_API_VERSION, shopifyApi } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";
import * as yaml from "js-yaml";
import { BEST_SELLER_SAMPLE_COUNT } from "../constants";
import { SupabaseSessionStorage } from "./supabase.session";
import { getBestSellers, setBestSellers, supabase } from "./supabase_queries";

// Do not call or export this for high traffic calls, will get throttled by Shopify API
const shopify_client_INTERNAL = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  apiVersion: LATEST_API_VERSION,
  scopes: [
    "write_pixels,read_customer_events,read_reports,read_customers,read_fulfillments,read_inventory,read_orders,read_products",
  ],
  hostName:
    process.env.VERCEL_HOST ??
    "sales-associate-backend-69cd426431e1.herokuapp.com",
  hostScheme: process.env.VERCEL_HOST === undefined ? "https" : "http",
  isEmbeddedApp: false,
}).clients;

// Session storage's store column does not have this
function stripHttps(url: string): string {
  if (url.startsWith("https://")) {
    return url.slice("https://".length);
  }
  return url;
}

// Do not call or export this for high traffic calls, will get throttled by Shopify API
const createClient = async (store: string) => {
  const session = (
    await new SupabaseSessionStorage().findSessionsByShop(stripHttps(store))
  )[0];
  const client = new shopify_client_INTERNAL.Rest({
    session,
    apiVersion: LATEST_API_VERSION,
  });
  return client;
};

interface ProductEntry {
  title: string;
  description: string;
  variants: any[];
  id: string;
  handle?: string; // Optional property
  image_url?: string; // Optional property
}

const formatCatalogEntry = (product: any, includeFullMetadata = true) => {
  const {
    id,
    title,
    body_html: description,
    handle,
    images, // This will be null when products are fetched from supabase
    image_url, // This will be null when products are fetched from Shopify API, will be retrieved from images field
    variants,
  } = product;

  const formattedVariants = variants?.map((variant: any) => {
    const baseVariant = {
      price: variant.price,
      title: variant.title,
    };
    if (includeFullMetadata) {
      return {
        ...baseVariant,
        id: variant.id,
        product_id: variant.product_id,
      };
    }
    return baseVariant;
  });

  let entry: ProductEntry = {
    id,
    title,
    description,
    variants: formattedVariants,
  };

  if (includeFullMetadata) {
    entry = {
      ...entry,
      handle,
      image_url: image_url ?? ((images && images.length > 0) ? images[0].src : ""),
    };
  }

  return entry;
};

export const getProducts = async (store: string, useShopifyApi=false) => {
  let products: any[] | undefined = undefined;
  if (useShopifyApi) {
    products = (
      await (
        await createClient(store)
      ).get<any>({
        path: "products",
        query: {
          "limit": 250
        }
      })
    ).body.products;
  } else {
    const { data: precomputed, error } = await supabase
      .from("catalog")
      .select("*")
      .eq("store", store);
    if (error || !precomputed || precomputed.length === 0) {
      console.error(error)
    } else {
      products = precomputed
    }
  }
  if (products === undefined) {
    console.error("No catalog exists");
    throw new Error("No catalog exists")
  }
  const formattedProductsWithUrls = products.map((product: any) =>
    formatCatalogEntry(product)
  );

  const formattedProductsWithoutUrls = products.map((product: any) =>
    formatCatalogEntry(product, false)
  );

  const metadataIds = formattedProductsWithoutUrls.map(
    (product: any) => product.id
  );
  const strippedProducts = formattedProductsWithoutUrls.map((product: any) => {
    return yaml.dump(product);
  });

  // The lookup is done after product_id is returned by OpenAI, so the products must include all info including URLs to render cards
  const lookUpProducts = formattedProductsWithUrls.reduce(
    (acc: Record<string, any>, product: any) => {
      acc[product.id] = product;
      return acc;
    },
    {}
  );

  return { metadataIds, strippedProducts, lookUpProducts, formattedProductsWithUrls };
};

const getProductByIdYaml = async (store: string, product_id: string) => {
    const { data } = await supabase
      .from("catalog")
      .select("*")
      .eq("store", store)
      .eq("id", product_id)
      .limit(1);
    
    if (!data || data.length !== 1) {
      console.error(`No product found with id ${product_id} in store ${store}`)
      throw new Error()
    }

  return yaml.dump(formatCatalogEntry(data[0]));
};

export const getProductById = async (store: string, product_id: string) => {
    const { data } = await supabase
      .from("catalog")
      .select("*")
      .eq("store", store)
      .eq("id", product_id)
      .limit(1);
    
    if (!data || data.length !== 1) {
      console.error(`No product found with id ${product_id} in store ${store}`)
      throw new Error()
    }

  return formatCatalogEntry(data[0]);
};

const getTwoWeekAgo = () => {
  // Get the current date
  const currentDate = new Date();

  // Calculate two weeks ago
  const twoWeeksAgo = new Date(currentDate);
  twoWeeksAgo.setDate(currentDate.getDate() - 14);
  return twoWeeksAgo;
};

export const computeBestSellers = async (store: string, limit = 10) => {
  const cachedBestSellers = await getBestSellers(store);
  if (cachedBestSellers && cachedBestSellers?.length > 0) {
    return cachedBestSellers;
  }
  let pageInfo;
  let ordersProcessed = 0;
  const orderCount: Record<string, { product_id: string; count: number }> = {};
  do {
    const data = await (
      await createClient(store)
    )
      // @ts-ignore
      .request<any>({
        // @ts-ignore
        method: "GET",
        path: "orders",
        query: {
          created_at_max: new Date().toISOString(),
          created_at_min: getTwoWeekAgo().toISOString(),
          fields: "line_items",
          limit: 250,
        },
      });

    // Process each order
    data.body.orders.forEach((order: any) => {
      order.line_items.forEach((item: any) => {
        const key = item.title;
        if (!orderCount[key]) {
          orderCount[key] = {
            product_id: item.product_id,
            count: 0,
          };
        }
        orderCount[key].count += 1; // Increment count
      });
    });

    pageInfo = data.pageInfo;
    ordersProcessed += data.body.orders.length;
  } while (pageInfo?.nextPage && ordersProcessed < BEST_SELLER_SAMPLE_COUNT);

  // Convert orderCount object to an array of objects and sort by count in descending order
  const sortedOrderCount = await Promise.all(
    Object.values(orderCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(async (order) => await getProductByIdYaml(store, order.product_id))
  );

  await setBestSellers(store, sortedOrderCount);
  // Limit the results to the specified limit
  return sortedOrderCount;
};

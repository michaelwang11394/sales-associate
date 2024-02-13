import { LATEST_API_VERSION, shopifyApi } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";
import * as yaml from "js-yaml";
import { BEST_SELLER_SAMPLE_COUNT } from "../constants";
import { SupabaseSessionStorage } from "./supabase.session";
import { getBestSellers, setBestSellers } from "./supabase_queries";

const shopify_client = shopifyApi({
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

const createClient = async (store: string) => {
  const session = (
    await new SupabaseSessionStorage().findSessionsByShop(stripHttps(store))
  )[0];
  const client = new shopify_client.Rest({
    session,
    apiVersion: LATEST_API_VERSION,
  });
  return client;
};

const formatCatalogEntry = (product: any) => {
  // Fields we care about
  const {
    id,
    title,
    body_html: description,
    handle,
    images,
    variants,
  } = product;
  // There's a image for each variant if any, otherwise it's an array of a single element
  const formattedVariants = variants?.map((variant: any) => {
    return {
      id: variant.id,
      price: variant.price,
      product_id: variant.product_id,
      title: variant.title,
    };
  });
  const image_url = images.length > 0 ? images[0].src : "";
  return {
    id,
    title,
    description,
    handle,
    image_url,
    variants: formattedVariants,
  };
};

export const isValidProduct = async (
  store: string,
  handle: string
): Promise<boolean> => {
  const data = (
    await (
      await createClient(store)
    ).get<any>({
      path: "products",
      query: { store: store, handle: handle },
    })
  ).body;
  return data.products.length > 0;
};

export const getProducts = async (store: string, limit = 250) => {
  const data = (
    await (
      await createClient(store)
    ).get<any>({
      path: "products",
    })
  ).body;
  if (data.products === undefined) {
    console.error("No catalog exists");
    // throw new Error("No catalog exists")
  }
  const formattedProducts = data.products.map((product: any) =>
    formatCatalogEntry(product)
  );

  const stringifiedProducts = formattedProducts
    .map((product: any) => JSON.stringify(product))
    .join("\r\n");

  // RAG and embeddings pre-processing
  const metadataIds = formattedProducts.map((product: any) => product.id);
  const strippedProducts = formattedProducts.map((product: any) => {
    // Convert each product object to a YAML object. Possibly remove brackets in the future too
    return yaml.dump(product);
  });

  const lookUpProducts = formattedProducts.reduce(
    (acc: Record<string, any>, product: any) => {
      acc[product.id] = product;
      return acc;
    },
    {}
  );

  return { stringifiedProducts, metadataIds, strippedProducts, lookUpProducts };
};

const getProductByIdYaml = async (store: string, product_id: string) => {
  const data = (
    await (
      await createClient(store)
    ).get<any>({
      path: "products/" + product_id,
    })
  ).body;

  return yaml.dump(formatCatalogEntry(data?.product));
};

export const getProductById = async (store: string, product_id: string) => {
  const data = (
    await (
      await createClient(store)
    ).get<any>({
      path: "products/" + product_id,
    })
  ).body;

  return formatCatalogEntry(data?.product);
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

import { LATEST_API_VERSION, shopifyApi } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";
import * as yaml from "js-yaml";
import { SupabaseSessionStorage } from "./supabase.session";

const shopify_client = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  apiVersion: LATEST_API_VERSION,
  scopes: ["read_products"],
  hostName: process.env.VERCEL_HOST ?? "sales-associate-backend.vercel.app",
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

const createRestClient = async (store: string) => {
  const session = (
    await new SupabaseSessionStorage().findSessionsByShop(stripHttps(store))
  )[0];
  const client = new shopify_client.Rest({
    session,
    apiVersion: LATEST_API_VERSION,
  });
  return client;
};

const createGraphqlClient = async (store: string) => {
  const session = (
    await new SupabaseSessionStorage().findSessionsByShop(stripHttps(store))
  )[0];
  const client = new shopify_client.Graphql({
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
      await createRestClient(store)
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
      await createRestClient(store)
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

  return { stringifiedProducts, metadataIds, strippedProducts };
};

const getTwoWeekAgo = () => {
  // Get the current date
  const currentDate = new Date();

  // Calculate two weeks ago
  const twoWeeksAgo = new Date(currentDate);
  twoWeeksAgo.setDate(currentDate.getDate() - 14);
  return twoWeeksAgo;
};

export const getBestSellers = async (store: string, limit = 10) => {
  const data = await (
    await createGraphqlClient(store)
  ).query({
    data: `query {
    shopifyqlQuery(query: "FROM products
VISUALIZE sum(net_sales) AS product_sales
TYPE BAR
GROUP BY product_title
SINCE last_month UNTIL yesterday
ORDER BY product_sales DESC
LIMIT 5
") {
      __typename
      ... on TableResponse {
        tableData {
          unformattedData
          rowData
          columns {
            name
            dataType
            displayName
          }
        }
      }
      parseErrors {
        code
        message
        range {
          start {
            line
            character
          }
          end {
            line
            character
          }
        }
      }
    }
  }`,
  });
  console.log(data);
};

import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";

export enum SenderType {
  AI = "ai",
  USER = "user",
  SYSTEM = "system", // Generated greetings, noninteractive
}

export const OPENAI_KEY = "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";
const supabaseUrl = "https://xrxqgzrdxkvoszkhvnzg.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeHFnenJkeGt2b3N6a2h2bnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTYxMDY2NDgsImV4cCI6MjAxMTY4MjY0OH0.7wQAVyg2lK41GxRae6B-lmEYR1ahWCHBDWoS09aiOnw";
export const supabase = createClient(supabaseUrl, supabaseKey);

const formatCatalogEntry = (product) => {
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
  const formattedVariants = variants?.map((variant) => {
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

const shopifyRestQuery = async (storeRoot, endpoint) => {
  try {
    return fetch(storeRoot + endpoint)
      .then((response) => response.json())
      .then((json) => {
        return json;
      });
  } catch (error) {
    console.error(
      `Error fetching endpoint ${endpoint}: with message %s`,
      error.message
    );
    return null;
  }
};

export const getProducts = async (storeRoot) => {
  // TODO: paginate for larger stores
  const json = await shopifyRestQuery(
    storeRoot,
    "products.json?limit=250&status=active&fields=id,body_html,handle,images,options"
  );
  const formattedProducts = json?.products?.map((product) =>
    formatCatalogEntry(product)
  );

  const stringifiedProducts = formattedProducts
    .map((product) => JSON.stringify(product))
    .join("\r\n");

  // RAG and embeddings pre-processing
  const metadataIds = formattedProducts.map((product) => product.id);
  const strippedProducts = formattedProducts.map((product) => {
    // Convert each product object to a string, remove quotes, newlines, and 'id'. Possibly remove brackets in the future too
    return JSON.stringify(product).replace(/"/g, "").replace(/\n/g, " ");
  });

  return { stringifiedProducts, metadataIds, strippedProducts };
};
// TODO: Update the store column. No way to do it from supabaseVector.
//TODO: Clean up stripped products to remove ids completely. Right now only the id key itself is removed.
export const createCatalogEmbeddings = async () => {
  const { metadataIds, strippedProducts } = await getProducts();
  try {
    const vectorStore = await SupabaseVectorStore.fromTexts(
      strippedProducts,
      metadataIds,
      new OpenAIEmbeddings({ openAIApiKey: OPENAI_KEY }),
      {
        client: supabase,
        tableName: "vector_catalog",
        queryName: "match_documents",
      }
    );
    return { success: true, vectorStore };
  } catch (error) {
    console.error("Error with creating product embedding:", error);
    return { success: false };
  }
};

export const getProductEmbedding = async (store) => {
  try {
    const { data } = await supabase
      .from("vector_catalog")
      .select("*")
      .eq("store", store);
    return { success: true, data };
  } catch (error) {
    console.error("Error", error);
    return {
      success: false,
      message: "An unexpected error with retreiving store embedding occurred.",
    };
  }
};

export const getLastPixelEvent = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .limit(1);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error subscribing to events." };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getMessages = async (clientId, limit) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .neq("sender", SenderType.SYSTEM)
      .limit(limit);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error getting messages." };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const insertMessage = async (clientId, type, sender, content) => {
  const { error } = await supabase.from("messages").insert([
    {
      clientId,
      type,
      sender,
      content,
    },
  ]);

  if (error) {
    console.error("Error during insert:", error);
    return false;
  }
  return true;
};

export const isNewCustomer = async (clientId) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", clientId)
      .gte("timestamp", oneWeekAgo.toISOString());

    if (error) {
      console.error("Error", error);
      return { isNew: false, message: "Error checking if customer is new." };
    }

    return {
      isNew: data.length <= 1,
      message:
        data.length <= 1
          ? "This is the first time the customer has visited the store."
          : "This customer has visited the store before.",
    };
  } catch (error) {
    console.error("Error", error);
    return { isNew: false, message: "An unexpected error occurred." };
  }
};

export const hasItemsInCart = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", clientId)
      .eq("name", "cart_viewed")
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error", error);
      return { hasItems: false, message: "Error checking cart items." };
    }

    if (data.length > 0 && data[0]?.detail?.cart) {
      const cartProductTitles = data[0].detail.cart.lines.map(
        (line) => line.merchandise.product.title
      );

      const cartURL = data[0].context.document.location.href;

      return {
        hasItems: true,
        message: `This customer has the following items in their cart: ${cartProductTitles.join(
          ", "
        )}`,
        cartURL: `The customer can go to their cart by clicking this link: ${cartURL}`,
      };
    } else {
      return {
        hasItems: false,
        message: "This customer does not have items in their cart.",
      };
    }
  } catch (error) {
    console.error("Error", error);
    return { hasItems: false, message: "An unexpected error occurred." };
  }
};

export const hasViewedProducts = async (clientId, count: number) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", clientId)
      .eq("name", "product_viewed")
      .gte("timestamp", oneWeekAgo.toISOString())
      .limit(count);

    if (error) {
      console.error("Error", error);
      return {
        hasViewed: false,
        message: "Error checking if customer has viewed products.",
      };
    }

    if (data.length > 0) {
      const productTitles = data.map(
        (item) => item.detail.productVariant.product.title
      );
      const productURLs = data.map(
        (item) => item.context.document.location.href
      );
      return {
        hasViewed: true,
        message: `This customer has viewed the following products: ${productTitles.join(
          ", "
        )}`,
        productURLs: `The customer can revisit these products by clicking these links: ${productURLs.join(
          ", "
        )}`,
      };
    } else {
      return {
        hasViewed: false,
        message: "This customer has not viewed any products.",
      };
    }
  } catch (error) {
    console.error("Error", error);
    return { hasViewed: false, message: "An unexpected error occurred." };
  }
};

export const offerCoupon = async (clientId) => {
  try {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", customerId)
      .eq("name", "cart_viewed")
      .gte("timestamp", thirtyMinutesAgo.toISOString());

    if (error) {
      console.error("Error", error);
      return {
        offerCoupon: false,
        message: "Error checking if customer has viewed products.",
      };
    }
    return { offerCoupon: data.length > 2 };
  } catch (error) {
    console.error("Error", error);
    return { offerCoupon: false, message: "An unexpected error occurred." };
  }
};

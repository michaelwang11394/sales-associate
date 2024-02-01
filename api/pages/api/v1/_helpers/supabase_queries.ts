import { createClient } from "@supabase/supabase-js";
import * as yaml from "js-yaml";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { SenderType } from "../types";
import { getProducts } from "./shopify";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

export const getMessages = async (
  store: string,
  clientId: string,
  filterSystem: boolean,
  limit: number
) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .eq("store", store)
      .neq("sender", filterSystem ? SenderType.SYSTEM : null)
      .limit(limit);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error getting messages." };
    }
    return { success: true, data: data };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getProductsMentioned = async (store: string, clientId: string) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("content")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .eq("store", store)
      .eq("type", "link")
      .limit(10);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error getting messages." };
    }

    return { success: true, data: data.map((item) => item.content) };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getMessagesFromIds = async (
  store: string,
  clientId: string,
  ids: number[]
) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .eq("store", store)
      .in("id", ids);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error getting messages." };
    }
    return { success: true, data: data };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const insertMessage = async (
  store: string,
  clientId: string,
  type: string,
  sender: string,
  content: string,
  requestUuid: string
) => {
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        clientId,
        type,
        sender,
        content,
        store,
        request_uuid: requestUuid,
      },
    ])
    .select();

  if (error) {
    console.error("Error during message insert:", error);
    return { success: false, data: data };
  }
  return { success: true, data: data };
};

export const getLastPixelEvent = async (store: string, clientId: string) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .eq("store", store)
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

export const isNewCustomer = async (store: string, clientId: string) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", clientId)
      .eq("store", store)
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

export const hasItemsInCart = async (store: string, clientId: string) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", clientId)
      .eq("store", store)
      .eq("name", "cart_viewed")
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error", error);
      return { hasItems: false, message: "Error checking cart items." };
    }

    if (data.length > 0 && data[0]?.detail?.cart) {
      const cartProductTitles = data[0].detail.cart.lines.map(
        (line: any) => line.merchandise.product.title
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

export const hasViewedProducts = async (
  store: string,
  clientId: string,
  count: number
) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", clientId)
      .eq("name", "product_viewed")
      .eq("store", store)
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
      // Extract titles
      const titles = data.map(
        (item) => item.detail.productVariant.product.title
      );
      // Remove duplicates by converting to Set and back to Array
      const uniqueTitles = Array.from(new Set(titles));
      // Convert to YAML
      const products = uniqueTitles.map((title) => yaml.dump(title));
      return {
        hasViewed: true,
        message: `This customer has viewed the following products:\n${products.join(
          "\r\n"
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

export const offerCoupon = async (store: string, clientId: string) => {
  try {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("store", store)
      .eq("clientId", clientId)
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

export const createEmbeddings = async (store: string) => {
  try {
    const { strippedProducts } = await getProducts(store);
    // Delete existing indices first
    const { error } = await supabase
      .from("vector_catalog")
      .delete()
      .eq("metadata", store);
    if (strippedProducts.length === 0 || error) {
      console.error("Store has no products");
      return { succes: false };
    }

    const vectorStore = await SupabaseVectorStore.fromTexts(
      strippedProducts,
      Array(strippedProducts.length).fill(store),
      new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_KEY }),
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

export const getMerchants = async (store: string) => {
  const { data } = await supabase
    .from("merchants")
    .select("*")
    .eq("domain", store);

  return data;
};

export const getBestSellers = async (store: string) => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDay() - 1);
  const { data } = await supabase
    .from("merchants")
    .select("best_sellers")
    .eq("store", store)
    .gte("best_seller_updated", oneDayAgo.toISOString());

  return data;
};

export const setBestSellers = async (store: string, best_sellers: any[]) => {
  const current = await getMerchants(store);
  if (current?.length !== 1) {
    console.log("No merchant entry for store in supabase");
    return false;
  }
  const updatedMerchant = current[0];
  updatedMerchant.best_seller_updated = new Date().toISOString();
  updatedMerchant.best_sellers = best_sellers;
  const { error } = await supabase
    .from("merchants")
    .upsert([updatedMerchant])
    .select();
  if (error) {
    console.error(error);
  }

  return !error;
};

export type ModelLoggingFields = {
  success: boolean;
  store: string;
  client_id: string;
  input: string;
  platform: string;
  model: string;
  run_id?: string;
  timestamp?: number;
  input_cost?: number;
  output_cost?: number;
  rate_type?: string;
  duration?: number;
  request_uuid: string;
  output?: string;
};

export const logModelRun = async (fields: ModelLoggingFields) => {
  const { error, data } = await supabase.from("models").insert(fields).select();
  if (error) {
    console.error("Error during models insert:", error);
    return { success: false, data: data };
  }
  return { success: true, data: data };
};

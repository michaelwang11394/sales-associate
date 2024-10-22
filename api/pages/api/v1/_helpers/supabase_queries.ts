import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";
import * as yaml from "js-yaml";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { SupabaseTables } from "../constants";
import { SenderType } from "../types";
import { EMBEDDING_SMALL_MODEL } from "./ai/constants";
import { getProducts } from "./shopify";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

export const clearUninstalled = async () => {
  const { data: deleted } = await supabase
    .from(SupabaseTables.UNINSTALLED)
    .select("*");

  const deletedIds = await Promise.all(
    (deleted || []).map(async (deleted) => {
      // Parse the timestamp from the database
      const deletedAt = new Date(deleted.created_at);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Check if the deleted_at timestamp is more than 3 days old
      if (deletedAt > threeDaysAgo) {
        console.log(
          `${deleted.created_at} is within the last 3 days. Don't delete yet`
        );
        return null;
      }
      if (deleted.store) {
        const { error } = await supabase
          .from("sessions")
          .delete()
          .eq("shop", deleted.store);
        if (error) {
          console.error(`session deletion failed for shop ${deleted.store}`);
        }
        return deleted.id;
      } else if (deleted.session_id) {
        const { error } = await supabase
          .from("sessions")
          .delete()
          .eq("id", deleted.session_id);
        if (error) {
          console.error(
            `session deletion failed for session id ${deleted.session_id}`
          );
        }
        return deleted.id;
      } else {
        console.error(
          `Session deletion failed for id ${deleted.id} as session id and store are null`
        );
        return null;
      }
    })
  );

  const { error } = await supabase
    .from(SupabaseTables.UNINSTALLED)
    .delete()
    .in(
      "id",
      deletedIds.filter((id) => id !== null)
    );
  if (error) {
    console.log("Error clearing uninstall table", error);
  }

  return !error && !deletedIds.includes(null);
};

export const refreshAllStores = async () => {
  const { data } = await supabase.from(SupabaseTables.SESSIONS).select("shop");
  if (!data || data.length === 0) {
    console.error("No merchant installs of our app");
    throw Error("No merchant installs of our app");
  }
  await Promise.all(
    data
      ?.map((merchant) => merchant.shop)
      .map(async (store) => {
        try {
          const { formattedProductsWithUrls, strippedProducts } =
            await getProducts(store, true);
          const { data: oldEmbeddings } = await supabase
            .from(SupabaseTables.EMBEDDINGS)
            .select("id")
            .eq("metadata", store);

          await SupabaseVectorStore.fromTexts(
            strippedProducts,
            Array(strippedProducts.length).fill(store),
            new OpenAIEmbeddings({
              modelName: EMBEDDING_SMALL_MODEL,
              openAIApiKey: process.env.OPENAI_KEY,
            }),
            {
              client: supabase,
              tableName: SupabaseTables.EMBEDDINGS,
              queryName: "match_documents",
            }
          );

          const { error: deleteOldEmbedding } = await supabase
            .from(SupabaseTables.EMBEDDINGS)
            .delete()
            .in(
              "id",
              oldEmbeddings!.map((embedding) => embedding.id)
            );
          if (deleteOldEmbedding) {
            throw new Error("error deleting old embed rows");
          }

          // Update catalog now
          const timestamp = Date.now();
          // Insert new catalog
          const { error: catalogInsertError } = await supabase
            .from(SupabaseTables.CATALOG)
            .upsert(
              formattedProductsWithUrls.map((product: any) => ({
                ...product,
                store,
                timestamp: timestamp,
              }))
            );
          if (catalogInsertError) {
            console.error(catalogInsertError);
            throw new Error("Error inserting new catalog");
          }

          // Delete stale catalog entries
          const { error } = await supabase
            .from(SupabaseTables.CATALOG)
            .delete()
            .eq("store", store)
            .neq("timestamp", timestamp);
          if (error) {
            throw new Error("error deleting old catalog rows");
          }
        } catch (e) {
          console.error(`Catalog refresh for store ${store} failed with`, e);
        }
      })
  );
  return Date.now();
};

export const getMessages = async (
  store: string,
  clientId: string,
  filterSystem: boolean,
  limit: number
) => {
  try {
    const { data, error } = await supabase
      .from(SupabaseTables.MESSAGES)
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .eq("store", store)
      .neq("sender", filterSystem ? SenderType.SYSTEM : null)
      .neq("sender", SenderType.SUMMARY)
      .limit(limit);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error getting messages." };
    }
    return { success: true, data: data.reverse() };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getLastSummaryMessage = async (
  store: string,
  clientId: string
) => {
  try {
    const { data, error } = await supabase
      .from(SupabaseTables.MESSAGES)
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .eq("store", store)
      .eq("sender", SenderType.SUMMARY)
      .limit(1);

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
      .from(SupabaseTables.MESSAGES)
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
      .from(SupabaseTables.MESSAGES)
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
    .from(SupabaseTables.MESSAGES)
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
      .from(SupabaseTables.EVENTS)
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
      .from(SupabaseTables.EVENTS)
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
      .from(SupabaseTables.EVENTS)
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
      .from(SupabaseTables.EVENTS)
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
      .from(SupabaseTables.EVENTS)
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

export const getMerchants = async (store: string) => {
  const { data } = await supabase
    .from(SupabaseTables.MERCHANTS)
    .select("*")
    .eq("domain", store);

  return data;
};

export const getBestSellers = async (store: string) => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDay() - 1);
  const { data } = await supabase
    .from(SupabaseTables.MERCHANTS)
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
    .from(SupabaseTables.MERCHANTS)
    .upsert([updatedMerchant])
    .select();
  if (error) {
    console.error(error);
  }

  return !error;
};

export const getMerchantStyle = async (store: string) => {
  const { data } = await supabase
    .from(SupabaseTables.MERCHANTS)
    .select("shop_style")
    .eq("store", store);

  return data;
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
  const { error, data } = await supabase
    .from(SupabaseTables.MODELS)
    .insert(fields)
    .select();
  if (error) {
    console.error("Error during models insert:", error);
    return { success: false, data: data };
  }
  return { success: true, data: data };
};

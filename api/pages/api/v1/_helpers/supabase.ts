import { createClient } from "@supabase/supabase-js";
import { SenderType } from "../types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

export const getCatalogProducts = async (store: string, limit: number) => {
  try {
    const { data, error } = await supabase
      .from("catalog")
      .select("*")
      .order("updated_at", { ascending: false })
      .eq("store", store)
      .limit(limit);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error getting catalog." };
    }
    return { success: true, data: data };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const isRealProductSupabase = async (store: string, handle: string) => {
  try {
    const { data, error } = await supabase
      .from("catalog")
      .select("*")
      .eq("handle", handle)
      .eq("store", store)
      .limit(1);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error getting product with handle." };
    }
    return { success: true, data: data };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

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
  content: string
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
      },
    ])
    .select();

  if (error) {
    console.error("Error during insert:", error);
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

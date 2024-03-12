import {
  API_URL,
  SUPABASE_EVENTS_NEW_CUSTOMER_ENDPOINT,
  SUPABASE_EVENTS_OFFER_COUPON_ENDPOINT,
  SUPABASE_EVENTS_VIEWED_PRODUCTS_ENDPOINT,
  SUPABASE_MERCHANT_STYLE_ENDPOINT,
  SUPABASE_MESSAGES_HISTORY_ENDPOINT,
  SUPABASE_MESSAGES_INSERT_ENDPOINT,
  SUPABASE_MESSAGES_PRODUCTS_MENTIONED_ENDPOINT,
  SUPABASE_PATH,
  SupabaseTables,
  V1,
} from "@/constants/constants";
import type { ApiResponse } from "@/constants/types";
import { HTTPHelper } from "./http";
const store = location.host;

export const getMessages = async (clientId, limit) => {
  try {
    const res = await HTTPHelper.get<ApiResponse>(
      API_URL,
      [
        V1,
        SUPABASE_PATH,
        SupabaseTables.MESSAGES,
        SUPABASE_MESSAGES_HISTORY_ENDPOINT,
      ],
      { store: store, clientId: clientId, limit: String(limit) }
    );
    return res.body;
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getMentionedProducts = async (clientId) => {
  try {
    const res = await HTTPHelper.get<ApiResponse>(
      API_URL,
      [
        V1,
        SUPABASE_PATH,
        SupabaseTables.MESSAGES,
        SUPABASE_MESSAGES_PRODUCTS_MENTIONED_ENDPOINT,
      ],
      { store: store, clientId: clientId }
    );
    return res.body;
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const insertMessage = async (
  clientId,
  type,
  sender,
  content,
  requestUuid
) => {
  const res = await HTTPHelper.get<ApiResponse>(
    API_URL,
    [
      V1,
      SUPABASE_PATH,
      SupabaseTables.MESSAGES,
      SUPABASE_MESSAGES_INSERT_ENDPOINT,
    ],
    {
      store: store,
      clientId: clientId,
      type: type,
      sender: sender,
      content: content,
      requestUuid: requestUuid,
    }
  );
  return res.body;
};

export const isNewCustomer = async (clientId) => {
  try {
    const res = await HTTPHelper.get<ApiResponse>(
      API_URL,
      [
        V1,
        SUPABASE_PATH,
        SupabaseTables.EVENTS,
        SUPABASE_EVENTS_NEW_CUSTOMER_ENDPOINT,
      ],
      { store: store, clientId: clientId }
    );
    return res.body;
  } catch (error) {
    console.error("Error", error);
    return { isNew: false, message: "An unexpected error occurred." };
  }
};

export const hasItemsInCart = async (clientId) => {
  try {
    const res = await HTTPHelper.get<ApiResponse>(
      API_URL,
      [
        V1,
        SUPABASE_PATH,
        SupabaseTables.EVENTS,
        SUPABASE_EVENTS_CART_ITEMS_ENDPOINT,
      ],
      { store: store, clientId: clientId }
    );
    return res.body;
  } catch (error) {
    console.error("Error", error);
    return { hasItems: false, message: "An unexpected error occurred." };
  }
};

export const hasViewedProducts = async (clientId, count: number) => {
  try {
    const res = await HTTPHelper.get<ApiResponse>(
      API_URL,
      [
        V1,
        SUPABASE_PATH,
        SupabaseTables.EVENTS,
        SUPABASE_EVENTS_VIEWED_PRODUCTS_ENDPOINT,
      ],
      { store: store, clientId: clientId, count: String(count) }
    );
    return res.body;
  } catch (error) {
    console.error("Error", error);
    return { hasViewed: false, message: "An unexpected error occurred." };
  }
};

export const offerCoupon = async (clientId) => {
  try {
    const res = await HTTPHelper.get<ApiResponse>(
      API_URL,
      [
        V1,
        SUPABASE_PATH,
        SupabaseTables.EVENTS,
        SUPABASE_EVENTS_OFFER_COUPON_ENDPOINT,
      ],
      { store: store, clientId: clientId }
    );
    return res.body;
  } catch (error) {
    console.error("Error", error);
    return { offerCoupon: false, message: "An unexpected error occurred." };
  }
};

export const getShopStyle = async (store) => {
  try {
    const res = await HTTPHelper.get<ApiResponse>(
      API_URL,
      [
        V1,
        SUPABASE_PATH,
        SupabaseTables.MERCHANTS,
        SUPABASE_MERCHANT_STYLE_ENDPOINT,
      ],
      { store: store }
    );
    return res.body;
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

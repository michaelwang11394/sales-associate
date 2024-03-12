export const PALETTE_DIV_ID = "palette_section";
export const MESSAGES_HISTORY_LIMIT = 8;
export const SUPABASE_MESSAGES_RETRIEVED = 20;
export const RETURN_TOP_N_SIMILARITY_DOCS = 5;
export const RECENTLY_VIEWED_PRODUCTS_COUNT = 5;

// API endpoints
/*
CAUTION: KEEP THIS SECTION IN SYNC WITH frontend/constants/constants.ts
*/
export const HEROKU_URL =
  "https://sales-associate-backend-69cd426431e1.herokuapp.com";
export const API_URL =
  (import.meta && import.meta.env && import.meta.env.VITE_VERCEL_LOCATION) ??
  HEROKU_URL;
export const V1 = "api/v1";
export const SUPABASE_PATH = "supabase";
export enum SupabaseTables {
  MESSAGES = "messages",
  EVENTS = "events",
  EMBEDDINGS = "vector_catalog",
  MERCHANTS = "merchants",
  CATALOG = "catalog",
  MODELS = "models",
}

export const SUPABASE_MESSAGES_HISTORY_ENDPOINT = "history";
export const SUPABASE_MESSAGES_PRODUCTS_MENTIONED_ENDPOINT =
  "products-mentioned";
export const SUPABASE_MESSAGES_INSERT_ENDPOINT = "insert";

export const SUPABASE_EVENTS_LAST_EVENT_ENDPOINT = "last";
export const SUPABASE_EVENTS_NEW_CUSTOMER_ENDPOINT = "new-customer";
export const SUPABASE_EVENTS_VIEWED_PRODUCTS_ENDPOINT = "viewed-products";
export const SUPABASE_EVENTS_OFFER_COUPON_ENDPOINT = "offer-coupon";

export const SUPABASE_EMBEDDINGS_CREATE_ENDPOINT = "create";
export const SUPABASE_MERCHANT_STYLE_ENDPOINT = "style";

export const OPENAI_PATH = "openai";
export const HINTS_PATH = "hints";
export const SUMMARIZE_PATH = "summarize";
export const EXPERIMENT_PATH = "capture-posthog";
export const UNINSTALL_CHECK = "uninstall-check";

export const shopStyleConfigDefault = {
  headerBackgroundColor: "#ffffff",
  searchBackgroundColor: "#ffffff",
  convoBackgroundColor: "#ffffff",
  fontFamily: "IBM Plex Mono",
  hintBubbleColor: "#D10000",
  specialColor: "#D10000", // airplane send logo and star ai logo
  systemFontColor: "#000",
  userFontColor: "#D10000",
};

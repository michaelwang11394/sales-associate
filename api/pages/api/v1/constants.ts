export const SUPABASE_MESSAGES_RETRIEVED = 20;
export const RETURN_TOP_N_SIMILARITY_DOCS = 5;
export const RECENTLY_VIEWED_PRODUCTS_COUNT = 5;

// LLM related
export const OPENAI_KEY = process.env.OPENAI_API_KEY!;
export const OPENAI_RETRIES = 3;
export const REPLICATE_KEY = process.env.REPLICATE_KEY!;

// Shopify API constants
export const BEST_SELLER_SAMPLE_COUNT = 1000;

// API endpoints
/*
CAUTION: KEEP THIS SECTION IN SYNC WITH frontend/constants/constants.ts
*/
export const V1 = "api/v1";

export const SUPABASE_PATH = "supabase"

// All tables
export enum SupabaseTables {
  MESSAGES = "messages",
  EVENTS = "events",
  SESSIONS = "sessions",
  EMBEDDINGS = "vector_catalog",
  MERCHANTS = "merchants",
  CATALOG = "catalog",
  POSTHOG = "posthog",
  MODELS = "models",
}

// What the store column name is
export const SupabaseTableStoreColumnName = {
  MESSAGES: "store",
  EVENTS: "store",
  SESSIONS: "shop",
  EMBEDDINGS: "metadata", // Cannot be updated as the LangChain Supabase relies on this field name
  MERCHANTS: "store",
  CATALOG: "store",
  POSTHOG: "store",
  MODELS: "store",
};


export const SUPABASE_MESSAGES_HISTORY_ENDPOINT = "history";
export const SUPABASE_MESSAGES_PRODUCTS_MENTIONED_ENDPOINT =
  "products-mentioned";
export const SUPABASE_MESSAGES_INSERT_ENDPOINT = "insert";

export const SUPABASE_EVENTS_LAST_EVENT_ENDPOINT = "last";
export const SUPABASE_EVENTS_NEW_CUSTOMER_ENDPOINT = "new-customer";
export const SUPABASE_EVENTS_CART_ITEMS_ENDPOINT = "cart-items";
export const SUPABASE_EVENTS_VIEWED_PRODUCTS_ENDPOINT = "viewed-products";
export const SUPABASE_EVENTS_OFFER_COUPON_ENDPOINT = "offer-coupon";

// For Cron jobs
export const SUPABASE_CRON_CATALOG = "refresh-catalog";

export const OPENAI_PATH = "openai";
export const HINTS_PATH = "hints";
export const EXPERIMENT_PATH = "capture-posthog";
export const UNINSTALL_CHECK = "uninstall-check";

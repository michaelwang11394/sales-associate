export const MESSAGES_HISTORY_LIMIT = 8;
export const SUPABASE_MESSAGES_RETRIEVED = 20;
export const RETURN_TOP_N_SIMILARITY_DOCS = 5;
export const RECENTLY_VIEWED_PRODUCTS_COUNT = 5;
/* CHATS 
// HACK: Replace key after migration to serverless
*/
export const OPENAI_KEY = process.env.OPENAI_API_KEY;
export const OPENAI_RETRIES = 3;

// API endpoints
/*
CAUTION: KEEP THIS SECTION IN SYNC WITH frontend/constants/constants.ts
*/
export const V1 = "api/v1";
export const SUPABASE_PATH = "supabase";
export const SUPABASE_MESSAGES_TABLE = "messages";
export const SUPABASE_EVENTS_TABLE = "events";
export const SUPABASE_EMBEDDINGS_TABLE = "vector_catalog";

export const SUPABASE_MESSAGES_HISTORY_ENDPOINT = "history";
export const SUPABASE_MESSAGES_INSERT_ENDPOINT = "insert";

export const SUPABASE_EVENTS_LAST_EVENT_ENDPOINT = "last";
export const SUPABASE_EVENTS_NEW_CUSTOMER_ENDPOINT = "new-customer";
export const SUPABASE_EVENTS_CART_ITEMS_ENDPOINT = "cart-items";
export const SUPABASE_EVENTS_VIEWED_PRODUCTS_ENDPOINT = "viewed-products";
export const SUPABASE_EVENTS_OFFER_COUPON_ENDPOINT = "offer-coupon";

export const OPENAI_PATH = "openai";
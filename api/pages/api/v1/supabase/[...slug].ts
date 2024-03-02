import type { NextApiRequest, NextApiResponse } from "next";
import {
  getLastPixelEvent,
  getMerchantStyle,
  getMessages,
  getProductsMentioned,
  hasItemsInCart,
  hasViewedProducts,
  insertMessage,
  isNewCustomer,
  offerCoupon,
} from "../_helpers/supabase_queries";
import {
  RECENTLY_VIEWED_PRODUCTS_COUNT,
  SUPABASE_EVENTS_CART_ITEMS_ENDPOINT,
  SUPABASE_EVENTS_LAST_EVENT_ENDPOINT,
  SUPABASE_EVENTS_NEW_CUSTOMER_ENDPOINT,
  SUPABASE_EVENTS_OFFER_COUPON_ENDPOINT,
  SUPABASE_EVENTS_VIEWED_PRODUCTS_ENDPOINT,
  SUPABASE_MERCHANT_STYLE_ENDPOINT,
  SUPABASE_MESSAGES_HISTORY_ENDPOINT,
  SUPABASE_MESSAGES_INSERT_ENDPOINT,
  SUPABASE_MESSAGES_PRODUCTS_MENTIONED_ENDPOINT,
  SupabaseTables,
} from "../constants";
import { httpResponse } from "../http";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.query.slug?.length !== 2) {
    return httpResponse(request, response, 404, "Invalid path");
  }
  if (request.method === "OPTIONS") {
    return response.status(200).send("ok");
  }
  const table = request.query.slug[0];
  const queryType = request.query.slug[1];

  const store = (request.query.store as string) === "lotushaus.studio" ? "lotushausstudio.myshopify.com" : request.query.store as string;
  const clientId = request.query.clientId as string;

  if (table === SupabaseTables.MESSAGES) {
    switch (queryType) {
      case SUPABASE_MESSAGES_HISTORY_ENDPOINT:
        return httpResponse(
          request,
          response,
          200,
          "Messages history query completed",
          await getMessages(
            store,
            clientId,
            true,
            Number(request.query.limit as string)
          )
        );
      case SUPABASE_MESSAGES_PRODUCTS_MENTIONED_ENDPOINT:
        return httpResponse(
          request,
          response,
          200,
          "Messages products mentioned query completed",
          await getProductsMentioned(store, clientId)
        );
      case SUPABASE_MESSAGES_INSERT_ENDPOINT:
        return httpResponse(
          request,
          response,
          200,
          "Messages insertion query completed",
          await insertMessage(
            store,
            clientId,
            request.query.type as string,
            request.query.sender as string,
            request.query.content as string,
            request.query.requestUuid as string
          )
        );
      default:
        return httpResponse(
          request,
          response,
          404,
          "Operation does not exist for messages table"
        );
    }
  } else if (table === SupabaseTables.EVENTS) {
    switch (queryType) {
      case SUPABASE_EVENTS_CART_ITEMS_ENDPOINT:
        return httpResponse(
          request,
          response,
          200,
          "Events cart items query completed",
          await hasItemsInCart(store, clientId)
        );
      case SUPABASE_EVENTS_LAST_EVENT_ENDPOINT:
        return httpResponse(
          request,
          response,
          200,
          "Events Last pixel event query completed",
          await getLastPixelEvent(store, clientId)
        );
      case SUPABASE_EVENTS_NEW_CUSTOMER_ENDPOINT:
        return httpResponse(
          request,
          response,
          200,
          "Events new customer query completed",
          await isNewCustomer(store, clientId)
        );
      case SUPABASE_EVENTS_OFFER_COUPON_ENDPOINT:
        return httpResponse(
          request,
          response,
          200,
          "Events coupon query completed",
          await offerCoupon(store, clientId)
        );
      case SUPABASE_EVENTS_VIEWED_PRODUCTS_ENDPOINT:
        return httpResponse(
          request,
          response,
          200,
          "Events recently viewed products completed",
          await hasViewedProducts(
            store,
            clientId,
            request.query.count
              ? Number(request.query.count as string)
              : RECENTLY_VIEWED_PRODUCTS_COUNT
          )
        );
      default:
        return httpResponse(
          request,
          response,
          404,
          "Operation does not exist for events table"
        );
    }
  } else if (table === SupabaseTables.MERCHANTS) {
    switch (queryType) {
      case SUPABASE_MERCHANT_STYLE_ENDPOINT:
        return httpResponse(
          request,
          response,
          200,
          "Merchant style query completed",
          await getMerchantStyle(store)
        );
      default:
        return httpResponse(
          request,
          response,
          404,
          "Operation does not exist for merchants table"
        );
    }
  }
  return httpResponse(
    request,
    response,
    404,
    "Path not valid for supabase calls"
  );
}

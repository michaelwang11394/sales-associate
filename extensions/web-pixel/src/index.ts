import { EXPERIMENT_PATH, HEROKU_URL, V1 } from "@/constants/constants";
import type { ApiResponse } from "@/constants/types";
import { HTTPHelper } from "@/helper/http";
import { register } from "@shopify/web-pixels-extension";

register(async ({ analytics, browser, settings }) => {
  // subscribe to events
  analytics.subscribe("all_events", async (event) => {
    console.log("web pixel event:", event);

    const { clientId, context, id, name, timestamp } = event;
    const pathname = context.document.location.pathname;
    const host = context.document.location.host;
    const detail = (event as any).data;
    const relevantClientId =
      (await browser.localStorage.getItem("webPixelShopifyClientId")) ??
      clientId;
    await browser.localStorage.setItem(
      "webPixelShopifyClientId",
      relevantClientId
    );
    // We are okay with events being stored temporarily whereas clientId has to be maintained across sessions
    const localEventsRaw = await browser.sessionStorage.getItem("webPixelShopifyLatestEvents" + host)
    const localEvents: [] = localEventsRaw ? JSON.parse(localEventsRaw) : []


    await browser.sessionStorage.setItem(
      "webPixelShopifyLatestEvent" + host,
      JSON.stringify([...localEvents, {
      id: id,
      timestamp: timestamp,
      detail: detail,
      clientId: clientId,
      context: context,
      name: name,
      store: host,
      order_amount: detail?.checkout?.totalPrice?.amount ?? 0,
      }])
    );
    // Only log the home page for now
    if (name == "page_viewed" && pathname !== "/") {
      return;
    } else {
      try {
        // WARNING: If you want to test this endpoint for dev, hard code the change here. environment variables won't work here
        await HTTPHelper.get<ApiResponse>(HEROKU_URL, [V1, EXPERIMENT_PATH], {
          store: host,
          clientId: relevantClientId,
          properties: JSON.stringify({
            id: id,
            timestamp: timestamp,
            detail: detail, // convert data object to JSON string
            clientId: relevantClientId,
            context: context, // convert context object to JSON string
            name: name,
            store: host,
          }),
        });
      } catch (error) {
        console.error("Error during fetch:", error);
      }
    }
  });
});

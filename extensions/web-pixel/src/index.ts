import { EXPERIMENT_PATH, HEROKU_URL, V1 } from "@/constants/constants";
import type { ApiResponse } from "@/constants/types";
import { HTTPHelper } from "@/helper/http";
import { register } from "@shopify/web-pixels-extension";
// Define here separate from @/constants/constants.ts as environment variables are set up differently in vite compiled theme app than this web pixel extension
export const PIXEL_SPECIFIC_API_URL =
  process.env.VITE_VERCEL_LOCATION ?? HEROKU_URL;

register(async ({ analytics, browser, settings }) => {
  // subscribe to events
  analytics.subscribe("all_events", async (event) => {
    console.log("web pixel event:", event);

    const { clientId, context, id, name, timestamp } = event;
    browser.localStorage.setItem("webPixelShopifyClientId", clientId);
    const detail = (event as any).data;

    const pathname = context.document.location.pathname;
    const host = context.document.location.host;
    // Only log the home page for now
    if (name == "page_viewed" && pathname !== "/") {
      return;
    } else {
      try {
        await HTTPHelper.get<ApiResponse>(
          PIXEL_SPECIFIC_API_URL,
          [V1, EXPERIMENT_PATH],
          {
            store: host,
            clientId: clientId,
            properties: JSON.stringify({
              id: id,
              timestamp: timestamp,
              detail: detail, // convert data object to JSON string
              clientId: clientId,
              context: context, // convert context object to JSON string
              name: name,
              store: host,
            }),
          }
        );
      } catch (error) {
        console.error("Error during fetch:", error);
      }
    }
  });
});

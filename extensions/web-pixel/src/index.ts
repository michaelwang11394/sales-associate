import type { ApiResponse } from "@/constants/types";
import { HTTPHelper } from "@/helper/http";
import { register } from "@shopify/web-pixels-extension";
export const VERCEL_URL =
  process.env.VITE_VERCEL_LOCATION ??
  "https://sales-associate-backend-69cd426431e1.herokuapp.com";
export const V1 = "api/v1";
export const EXPERIMENT_PATH = "capture-posthog";

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
        await HTTPHelper.get<ApiResponse>(VERCEL_URL, [V1, EXPERIMENT_PATH], {
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
        });
      } catch (error) {
        console.error("Error during fetch:", error);
      }
    }
  });
});

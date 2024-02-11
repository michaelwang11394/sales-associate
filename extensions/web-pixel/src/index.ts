import { register } from "@shopify/web-pixels-extension";
import supabase from "extensions/web-pixel/helpers/supabase";
import { PostHog } from "posthog-node";

register(async ({ analytics, browser, settings }) => {
  // subscribe to events
  analytics.subscribe("all_events", async (event) => {
    console.log("web pixel event:", event);

    const { clientId, context, id, name, timestamp } = event;
    browser.localStorage.setItem("webPixelShopifyClientId", clientId);
    const detail = (event as any).data;
    const client = new PostHog(
      "phc_6YNAbj13W6OWd4CsBcXtyhy4zWUG3SNRb9EkXYjiGk4"
    );

    const pathname = context.document.location.pathname;
    const host = context.document.location.host;
    // Only log the home page for now
    if (name == "page_viewed" && pathname !== "/") {
      return;
    } else {
      try {
        const { error } = await supabase.from("events").insert([
          {
            id: id,
            timestamp: timestamp,
            detail: detail, // convert data object to JSON string
            clientId: clientId,
            context: context, // convert context object to JSON string
            name: name,
            store: host,
          },
        ]);
        client.capture({
          distinctId: host + clientId,
          event: name,
          properties: {
            id: id,
            timestamp: timestamp,
            detail: detail, // convert data object to JSON string
            clientId: clientId,
            context: context, // convert context object to JSON string
            store: host,
          },
        });

        if (error) {
          console.error("Error during insert:", error);
        }
      } catch (error) {
        console.error("Error during fetch:", error);
      }
    }
    await client.shutdownAsync();
  });
});

import { register } from "@shopify/web-pixels-extension";
import supabase from "extensions/web-pixel/helpers/supabase";

register(async ({ analytics, browser, settings }) => {
  // subscribe to events
  analytics.subscribe("all_events", async (event) => {
    console.log("web pixel event:", event);

    const { clientId, context, id, name, timestamp } = event;
    const detail = (event as any).data;

    console.log("detail:", detail);

    const pathname = context.document.location.pathname;
    // Only log the home page for now
    if (name == "page_viewed" && pathname !== "/") {
      return;
    } else {
      try {
        const { error } = await supabase.from("events").insert([
          {
            id,
            timestamp,
            detail: detail, // convert data object to JSON string
            clientId,
            context, // convert context object to JSON string
            name,
          },
        ]);

        if (error) {
          console.error("Error during insert:", error);
        }
      } catch (error) {
        console.error("Error during fetch:", error);
      }
    }
  });
});

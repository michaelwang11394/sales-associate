import { register } from "@shopify/web-pixels-extension";
import supabase from "extensions/web-pixel/helpers/supabase";

register(async ({ analytics, browser, settings }) => {
  // subscribe to events
  analytics.subscribe("all_events", async (event) => {
    console.log("web pixel event:", event);
    const { clientId, context, id, name, timestamp } = event;

    try {
      const { data, error } = await supabase.from("events").insert([
        {
          id,
          timestamp,
          clientId,
          context: JSON.stringify(context), // convert context object to JSON string
          name,
        },
      ]);

      if (error) {
        console.error("Error during insert:", error);
      } else {
        console.log("web pixel event sent", data);
      }
    } catch (error) {
      console.error("Error during fetch:", error);
    }
  });
});

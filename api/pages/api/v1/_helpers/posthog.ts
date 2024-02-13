import type { PostHog } from "posthog-node";
import { supabase } from "./supabase_queries";

export const captureEvent = async (
  client: PostHog,
  store: string,
  clientId: string,
  properties: any
) => {
  client.capture({
    distinctId: store + clientId,
    event: properties.name,
    properties: properties,
  });

  const { context, id, name, timestamp, detail } = properties;
  const supabaseWritten = await supabase.from("events").insert([
    {
      id: id,
      timestamp: timestamp,
      detail: detail, // convert data object to JSON string
      clientId: clientId,
      context: context, // convert context object to JSON string
      name: name,
      store: store,
    },
  ]);

  return supabaseWritten;
};

import type { PostHog } from "posthog-node";
import { supabase } from "./supabase_queries";

export const captureEvent = async (
  client: PostHog,
  store: string,
  clientId: string,
  properties: any
) => {
  // We have to re-expose here to get the variant that is associated with user. Cannot expose on client in web-pixel as that would bloat it beyond 128kb size limit
  client?.identify({ distinctId: clientId, properties: { store: store } });
  const variant = await client.getFeatureFlag("enabled", clientId);

  const { context, id, name, timestamp, detail } = properties;
  client.capture({
    distinctId: clientId,
    event: name,
    properties: {
      ...properties,
      order_amount: detail?.checkout?.totalPrice?.amount ?? 0,
      "$feature/enabled": variant, // Odd formatting but this key string gets is necessary for events to show up in posthog's experiment tab
    },
  });

  const supabaseWritten = await supabase.from("events").insert([
    {
      id: id,
      timestamp: timestamp,
      detail: detail,
      clientId: clientId,
      context: context,
      name: name,
      store: store,
      order_amount: detail?.checkout?.totalPrice?.amount ?? 0
    },
  ]);

  return supabaseWritten;
};

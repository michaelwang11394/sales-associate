import type { PostHog } from "posthog-node";

export const expose = async (
  client: PostHog,
  store: string,
  clientId: string
) => {
  const variant = await client.getFeatureFlag("enabled", store + clientId);
  console.log("BOI exposed with posthog", variant);

  return variant;
};

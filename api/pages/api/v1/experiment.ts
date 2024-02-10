import type { NextApiRequest, NextApiResponse } from "next";
import { PostHog } from "posthog-node";
import { expose } from "./_helpers/posthog";
import { httpResponse } from "./http";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === "OPTIONS") {
    return response.status(200).send("ok");
  }

  const client = new PostHog(process.env.POSTHOG_KEY!);
  const store = request.query.store as string;
  const clientId = request.query.clientId as string;

  const res = httpResponse(
    request,
    response,
    200,
    "Exposed with posthog successfully",
    await expose(client, store, clientId)
  );
  await client.shutdownAsync(); // TIP: On program exit, call shutdown to stop pending pollers and flush any remaining events
  return res;
}

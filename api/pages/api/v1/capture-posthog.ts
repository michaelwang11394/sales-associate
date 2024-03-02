import type { NextApiRequest, NextApiResponse } from "next";
import { PostHog } from "posthog-node";
import { captureEvent } from "./_helpers/posthog";
import { httpResponse } from "./http";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === "OPTIONS") {
    return response.status(200).send("ok");
  }

  const client = new PostHog(process.env.POSTHOG_KEY!);
  const store = (request.query.store as string) === "lotushaus.studio" ? "lotushausstudio.myshopify.com" : request.query.store as string;
  const clientId = request.query.clientId as string;
  const propertiesBlob = JSON.parse(request.query.properties as string);

  const res = httpResponse(
    request,
    response,
    200,
    "Logged pixel event successfully",
    await captureEvent(client, store, clientId, propertiesBlob)
  );
  await client.shutdownAsync(); // TIP: On program exit, call shutdown to stop pending pollers and flush any remaining events
  return res;
}

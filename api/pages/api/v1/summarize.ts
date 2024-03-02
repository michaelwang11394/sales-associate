import type { NextApiRequest, NextApiResponse } from "next";
import { summarizeHistory } from "./_helpers/ai/ai";
import { httpResponse } from "./http";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === "OPTIONS") {
    return response.status(200).send("ok");
  }

  const store = (request.query.store as string) === "lotushaus.studio" ? "lotushausstudio.myshopify.com" : request.query.store as string;
  const clientId = request.query.clientId as string;
  const requestUuid = request.query.requestUuid as string;

  return httpResponse(
    request,
    response,
    200,
    "Summarized messages successfully",
    await summarizeHistory(store, clientId, requestUuid)
  );
}

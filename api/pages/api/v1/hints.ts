import type { NextApiRequest, NextApiResponse } from "next";
import { callOpenai } from "./_helpers/ai/ai";
import { httpResponse } from "./http";
import type { MessageSource } from "./types";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === "OPTIONS") {
    return response.status(200).send("ok");
  }

  const input = request.query.input as string;
  const store = (request.query.store as string) === "lotushaus.studio" ? "lotushausstudio.myshopify.com" : request.query.store as string;
  const clientId = request.query.clientId as string;
  const requestUuid = request.query.requestUuid as string;
  const source = request.query.source as MessageSource;
  const cart = request.query.cart as string;

  return httpResponse(
    request,
    response,
    200,
    "Hints returned successfully",
    await callOpenai(input, store, clientId, requestUuid, source, cart)
  );
}

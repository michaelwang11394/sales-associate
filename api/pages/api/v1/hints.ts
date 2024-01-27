import type { NextApiRequest, NextApiResponse } from "next";
import { callOpenai } from "./_helpers/ai/ai";
import type { MessageSource } from "./types";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === "OPTIONS") {
    return response.status(200).send("ok");
  }

  const input = request.query.input as string;
  const store = request.query.store as string;
  const clientId = request.query.clientId as string;
  const requestUuid = request.query.requestUuid as string;
  const source = request.query.source as MessageSource;
  const messageIds = request.query.ids as string[];

  await callOpenai(input, store, clientId, requestUuid, source, messageIds);

  /*
  try {
    return httpResponse(
      request,
      response,
      200,
      "Openai call finished with",
      await callOpenai(input, store, clientId, requestUuid, source, messageIds)
    );
  } catch (error: any) {
    return httpResponse(request, response, 404, error.message);
  }
  */
}

import type { NextApiRequest, NextApiResponse } from "next";
import { httpResponse } from "./http";
import type { MessageSource } from "./types";
import { callOpenai } from "./_helpers/ai";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const input = request.query.input as string;
  const store = request.query.store as string;
  const clientId = request.query.clientId as string;
  const source = request.query.source as MessageSource;
  const messageIds = request.query.ids as string[];

  try {
    return httpResponse(
      request,
      response,
      200,
      "Openai call finished with",
      await callOpenai(input, store, clientId, source, messageIds)
    );
  } catch (error: any) {
    return httpResponse(request, response, 404, error.message);
  }
}

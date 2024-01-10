import EventEmitter from "events";
import type { NextApiRequest, NextApiResponse } from "next";
import { callOpenai } from "./_helpers/ai/ai";
import type { MessageSource } from "./types";

// This function can run for a maximum of 5 seconds
export const config = {
  maxDuration: 180,
  api: {
    externalResolver: true,
  },
};

const stream = new EventEmitter();

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === "OPTIONS") {
    return response.status(200).send("ok");
  }

  response.writeHead(200, {
    Connection: "keep-alive",
    "Content-Encoding": "none",
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream",
    "Access-Control-Allow-Origin": "*",
  });

  const input = request.query.input as string;
  const store = request.query.store as string;
  const clientId = request.query.clientId as string;
  const requestUuid = request.query.requestUuid as string;
  const source = request.query.source as MessageSource;
  const messageIds = request.query.ids as string[];

  callOpenai(input, store, clientId, requestUuid, source, messageIds, stream);

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

  stream.on("channel", function (event, data) {
    if (event === "chunk") {
      response.write(data);
    } else if (event === "end") {
      // Signal the end of the stream
      console.log("openai response done");
      response.end();
    }
  });
}

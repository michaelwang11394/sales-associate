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
  const store = (request.query.store as string) === "lotushaus.studio" ? "lotushausstudio.myshopify.com" : request.query.store as string;
  const clientId = request.query.clientId as string;
  const requestUuid = request.query.requestUuid as string;
  const source = request.query.source as MessageSource;
  const cart = request.query.cart as string;
  stream.on("channel" + requestUuid, async function (event, data) {
    if (event === "chunk") {
      await new Promise<void>((resolve) => {
        response.write(data, "utf-8", () => resolve());
      });
    } else if (event === "end") {
      // Signal the end of the stream
      response.end();
      response.destroy();
      stream.removeAllListeners("channel" + requestUuid);
    }
  });

  await callOpenai(input, store, clientId, requestUuid, source, cart, stream);
}

import EventEmitter from "events";
import type { NextApiRequest, NextApiResponse } from "next";
import { callOpenai } from "./_helpers/ai/ai";
import type { MessageSource } from "./types";

const stream = new EventEmitter();

export const config = {
  maxDuration: 60,
  api: {
    externalResolver: true,
  },
};

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  console.log("received request");

  if (request.method === "OPTIONS") {
    console.log("preflight");
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
  const source = request.query.source as MessageSource;
  const messageIds = request.query.ids as string[];

  callOpenai(input, store, clientId, source, messageIds, stream);

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

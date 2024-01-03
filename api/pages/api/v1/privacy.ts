import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "node:stream";
import { httpResponse } from "./http";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// This is necessary for data privacy, but we delete all shop data on uninstall, and we collect no user specific data
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const hmac = request.headers["x-shopify-hmac-sha256"];
  const buf = await buffer(request);
  const rawBody = buf.toString("utf8");

  const hash = createHmac("sha256", process.env.APP_SECRET!)
    .update(rawBody)
    .digest("base64");
  const valid = hmac === hash;
  return httpResponse(
    request,
    response,
    valid ? 200 : 401,
    valid ? "privacy hook finished" : "invalid hmac"
  );
}

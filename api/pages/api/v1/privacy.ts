import type { NextApiRequest, NextApiResponse } from "next";
import { httpResponse } from "./http";

// This is necessary for data privacy, but we delete all shop data on uninstall, and we collect no user specific data
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  return httpResponse(request, response, 200, "privacy hook finished");
}

import type { NextApiRequest, NextApiResponse } from "next";
import { clearUninstalled } from "./_helpers/supabase_queries";
import { httpResponse } from "./http";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === "OPTIONS") {
    return response.status(200).send("ok");
  }

  const res = httpResponse(
    request,
    response,
    200,
    "Removed all data for stores that have uninstalled",
    clearUninstalled(),
  );
  return res;
}

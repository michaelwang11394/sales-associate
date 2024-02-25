import type { NextApiRequest, NextApiResponse } from "next";
import { refreshAllStores } from "./_helpers/supabase_queries";
import { httpResponse } from "./http";

export const revalidate = 0

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === "OPTIONS") {
    return response.status(200).send("ok");
  }

  return httpResponse(
    request,
    response,
    200,
    "Finished all store embeddings and catalog update",
    await refreshAllStores(),
  );
}
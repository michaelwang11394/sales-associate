import { OPENAI_PATH, V1 } from "@/constants/constants";
import { HTTPHelper } from "./http";
import type { ApiResponse } from "@/constants/types";

const VERCEL_URL = "http://localhost:3000";

export const callOpenai = async (
  input: string,
  clientId: string,
  source: string,
  messageIds: string[]
) => {
  const res = await HTTPHelper.get<ApiResponse>(VERCEL_URL, [V1, OPENAI_PATH], {
    input,
    store: location.origin,
    clientId,
    source,
    ids: messageIds,
  });
  return res.body;
};

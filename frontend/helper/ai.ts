import { OPENAI_PATH, V1, VERCEL_URL } from "@/constants/constants";
import type { ApiResponse } from "@/constants/types";
import { HTTPHelper } from "./http";

export const callOpenai = async (
  input: string,
  clientId: string,
  requestUuid: string,
  source: string,
  messageIds: string[]
) => {
  const res = await HTTPHelper.get<ApiResponse>(VERCEL_URL, [V1, OPENAI_PATH], {
    input: input,
    store: location.host,
    clientId: clientId,
    requestUuid: requestUuid,
    source: source,
    ids: messageIds,
  });
  return res.body;
};

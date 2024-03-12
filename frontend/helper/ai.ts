import {
  API_URL,
  HINTS_PATH,
  OPENAI_PATH,
  SUMMARIZE_PATH,
  V1,
} from "@/constants/constants";
import { HTTPHelper } from "./http";
import { getCartItems } from "./shopify";

export const callOpenai = async (
  input: string,
  clientId: string,
  requestUuid: string,
  source: string
) => {
  const url = HTTPHelper.assembleUrl(API_URL, [V1, OPENAI_PATH], {
    input: input,
    store: location.host,
    clientId: clientId,
    requestUuid: requestUuid,
    source: source,
    cart: await getCartItems()
  });
  // make a POST call to our api route
  let res = await fetch(url, {
    method: "POST",
  });
  return res?.body?.getReader();
};

export const callHints = async (
  input: string,
  clientId: string,
  requestUuid: string,
  source: string
) => {
  const res: Response = await HTTPHelper.get(API_URL, [V1, HINTS_PATH], {
    input: input,
    store: location.host,
    clientId: clientId,
    requestUuid: requestUuid,
    source: source,
    cart: await getCartItems()
  });
  return res?.body;
};

export const summarizeHistory = async (
  clientId: string,
  requestUuid: string
) => {
  const res: Response = await HTTPHelper.get(API_URL, [V1, SUMMARIZE_PATH], {
    store: location.host,
    clientId: clientId,
    requestUuid: requestUuid,
  });
  return res?.body;
};

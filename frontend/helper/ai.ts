import { OPENAI_PATH, V1, VERCEL_URL } from "@/constants/constants";
import { HTTPHelper } from "./http";

export const callOpenai = async (
  input: string,
  clientId: string,
  source: string,
  messageIds: string[]
): Promise<void> => {
  const url = HTTPHelper.assembleUrl(VERCEL_URL, [V1, OPENAI_PATH], {
    input: input,
    store: location.host,
    clientId: clientId,
    source: source,
    ids: messageIds,
  });
  console.log("hitting " + url);
  // make a POST call to our api route
  let res = await fetch(url, {
    method: "POST",
  });
  let full = "";
  const reader = res?.body?.getReader();
  while (true) {
    const { done, value } = await reader!.read();
    if (done) {
      // Do something with last chunk of data then exit reader
      reader?.cancel();
      console.log("ending reader)");
      return;
    }
    let chunk = new TextDecoder("utf-8").decode(value);
    full += chunk;
    console.log("BOI", chunk);
    console.log("BOI", full);
  }
};

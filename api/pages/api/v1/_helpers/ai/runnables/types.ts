import type { BufferMemory } from "langchain/memory";
import type { RunnableSequence } from "langchain/schema/runnable";
import { OPENAI_RETRIES } from "../../../constants";
import {
  HallucinationError,
  HalluctinationCheckSeverity,
  MessageSource,
} from "../../../types";
import { isValidProduct } from "../../shopify";

// TODO donotcommit, only for DEV
const STREAM_DEV_FLAG = false;

export class RunnableWithMemory {
  constructor(
    private runnable: RunnableSequence,
    private memory: BufferMemory,
    private hallucinationSeverity: HalluctinationCheckSeverity
  ) {
    this.runnable = runnable;
    this.memory = memory;
    this.hallucinationSeverity = hallucinationSeverity;
  }

  private runPrivate = async (
    input: string,
    store: string,
    messageSource: MessageSource,
    clientId: string,
    requestUuid: string,
    retry_left: number
  ): Promise<any> => {
    if (retry_left === 0) {
      throw new Error("openai retries exceeded");
    }
    let res = undefined;
    try {
      if (STREAM_DEV_FLAG) {
        const streamResponse = await this.runnable.stream(
          { input: input },
          {
            metadata: {
              requestUuid: requestUuid,
              store: store,
              clientId: clientId,
            },
          }
        );
        let rawResponse = "";
        const chunks: string[] = [];

        for await (const chunk of streamResponse) {
          // Collect each chunk
          chunks.push(JSON.stringify(chunk));
          console.log(JSON.stringify(chunk));
          const rawChunk =
            messageSource === MessageSource.CHAT
              ? chunk?.additional_kwargs?.function_call?.arguments
              : chunk?.content;
          if (!rawChunk) continue;
          rawResponse += rawChunk;
        }
        if (messageSource !== MessageSource.CHAT) {
          return { valid: "valid", product: rawResponse };
        }
        res = JSON.parse(rawResponse);
      } else {
        const invokeResponse = await this.runnable.invoke(
          { input: input },
          {
            metadata: {
              requestUuid: requestUuid,
              store: store,
              clientId: clientId,
            },
          }
        );
        console.log(invokeResponse);
        if (messageSource !== MessageSource.CHAT) {
          return { valid: "valid", product: invokeResponse?.content };
        }
        res = JSON.parse(
          invokeResponse?.additional_kwargs?.function_call?.arguments
        );
      }
      // Check with the zod schema if products returned
      if (
        this.hallucinationSeverity > HalluctinationCheckSeverity.NONE &&
        res.products?.length > 0
      ) {
        const filtered = await Promise.all(
          res.products.map(async (product: any) => {
            // Check image field
            const imageUrl = product.image;
            const fileExtension = (
              imageUrl?.split(".").pop()?.split("?")[0] || ""
            ).toLowerCase();
            // Check if image file extension and handle is real product
            const valid =
              (imageUrl?.startsWith("cdn.shopify.com") ||
                imageUrl?.startsWith("https://cdn.shopify.com")) &&
              (fileExtension === "jpg" ||
                fileExtension === "jpeg" ||
                fileExtension === "png" ||
                fileExtension === "gif") &&
              (await isValidProduct(store, product.product_handle));
            return { valid: valid, product: product };
          })
        );
        if (filtered.some((product) => !product.valid)) {
          const hallucinated = filtered
            .filter((product) => !product.valid)
            .map((product) => product.product);
          if (
            this.hallucinationSeverity === HalluctinationCheckSeverity.FILTER
          ) {
            console.error(
              "Hallucination detected but filtered out:",
              hallucinated
            );
          } else if (
            this.hallucinationSeverity > HalluctinationCheckSeverity.FILTER
          ) {
            throw new HallucinationError(
              "Hallucination detected with" + JSON.stringify(hallucinated)
            );
          }
        }
        res.products = filtered
          .filter((product) => product.valid)
          .map((product) => product.product);
      }
      return res;
    } catch (error: any) {
      if (error instanceof HallucinationError) {
        switch (this.hallucinationSeverity) {
          case HalluctinationCheckSeverity.FAIL:
            throw error;
          case HalluctinationCheckSeverity.RETRY:
            // Means openai function parsing or hallucination failed, retry
            return this.runPrivate(
              input,
              store,
              messageSource,
              clientId,
              requestUuid,
              retry_left - 1
            );
          case HalluctinationCheckSeverity.FILTER:
          case HalluctinationCheckSeverity.NONE:
            throw new Error("Hallucination is not handled correctly");
        }
      } else if (error instanceof SyntaxError) {
        // Means openai function parsing or hallucination failed, retry
        return this.runPrivate(
          input,
          store,
          messageSource,
          clientId,
          requestUuid,
          retry_left - 1
        );
      } else {
        throw error;
      }
    }
  };

  public run = async (
    input: string,
    store: string,
    messageSource: MessageSource,
    clientId: string,
    requestUuid: string
  ) => {
    return await this.runPrivate(
      input,
      store,
      messageSource,
      clientId,
      requestUuid,
      OPENAI_RETRIES
    );
  };
}

import type { RunnableSequence } from "langchain/schema/runnable";
import { OPENAI_RETRIES } from "../../../constants";
import {
  HallucinationError,
  HalluctinationCheckSeverity,
} from "../../../types";
import { isValidProduct } from "../../shopify";

export class RunnableWithRetry {
  constructor(
    private runnable: RunnableSequence,
    private hallucinationSeverity: HalluctinationCheckSeverity
  ) {
    this.runnable = runnable;
    this.hallucinationSeverity = hallucinationSeverity;
  }

  private runPrivate = async (
    input: string,
    store: string,
    clientId: string,
    requestUuid: string,
    retry_left: number
  ): Promise<{ valid: string; product: string }> => {
    if (retry_left === 0) {
      throw new Error("openai retries exceeded");
    }
    try {
      const res = await this.runnable.invoke(
        { input: input },
        {
          metadata: {
            requestUuid: requestUuid,
            store: store,
            clientId: clientId,
          },
        }
      );
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
    clientId: string,
    requestUuid: string
  ) => {
    return await this.runPrivate(
      input,
      store,
      clientId,
      requestUuid,
      OPENAI_RETRIES
    );
  };
}
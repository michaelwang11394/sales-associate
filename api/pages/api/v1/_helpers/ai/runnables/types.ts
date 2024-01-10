import type EventEmitter from "events";
import type { RunnableSequence } from "langchain/schema/runnable";
import { OPENAI_RETRIES } from "../../../constants";

export class RunnableWithMemory {
  constructor(
    private runnable: RunnableSequence,
    private stream: EventEmitter
  ) {
    this.runnable = runnable;
    this.stream = stream;
  }

  private runPrivate = async (
    input: string,
    store: string,
    clientId: string,
    requestUuid: string,
    retry_left: number
  ): Promise<void> => {
    if (retry_left === 0) {
      throw new Error("openai retries exceeded");
    }
    try {
      const res = await this.runnable.stream({ input: input });

      // Create an array to store chunks
      const chunks: string[] = [];

      let fullResponse = "";

      for await (const chunk of res) {
        // Collect each chunk
        chunks.push(JSON.stringify(chunk));
        fullResponse += chunk?.additional_kwargs?.function_call?.arguments;
        this.stream.emit(
          "channel",
          "chunk",
          chunk?.additional_kwargs?.function_call?.arguments
        );
      }

      const concatenatedChunks = chunks.join("\n");

      // Write the concatenated data to the file
      /*
      await fs.writeFile(
        "/Users/oniken/output-" + Date.now(),
        concatenatedChunks,
        {
          flag: "a",
        }
      );
      */

      this.stream.emit("channel", "end", "");
      /*
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

      */
    } catch (error: any) {
      /* TODO: If we're streaming cannot check entire response before returning. So FAIL and RETRY are not feasible
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
    */
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

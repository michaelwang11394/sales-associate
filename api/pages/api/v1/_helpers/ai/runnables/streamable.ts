import { parse } from "best-effort-json-parser";
import type EventEmitter from "events";
import type { RunnableSequence } from "langchain/schema/runnable";
import { MessageSource } from "../../../types";

export enum StructuredOutputStreamState {
  TEXT = 1,
  PRODUCT = 2,
}

export const productDelimiter = "====PRODUCT====";
export const recDelimiter = "====REC====";

export class Streamable {
  constructor(
    private runnable: RunnableSequence,
    private productMappings: { [key: string]: any },
    private stream: EventEmitter
  ) {
    this.runnable = runnable;
    this.productMappings = productMappings;
    this.stream = stream;
  }

  static getDiff = (prefix: string, longerString: string): string => {
    // Ensure that longerString is indeed longer and starts with the prefix
    if (
      longerString.length <= prefix.length ||
      !longerString.startsWith(prefix)
    ) {
      throw new Error("Invalid input");
    }

    // Extract the part of longerString after the prefix
    const diff = longerString.substring(prefix.length);

    return diff;
  };

  public run = async (
    input: string,
    store: string,
    messageSource: MessageSource,
    clientId: string,
    requestUuid: string
  ) => {
    try {
      const res = await this.runnable.stream(
        { input: input },
        {
          metadata: {
            requestUuid: requestUuid,
            store: store,
            clientId: clientId,
          },
        }
      );

      // Create an array to store chunks
      const chunks: string[] = [];
      let response = "";
      let state = StructuredOutputStreamState.TEXT;
      let productSentCount = 0;
      let productsSent: { product_id?: string; recommendation?: string }[] =
        Array(10).fill({});

      let sentParsedText = ``;
      for await (const chunk of res) {
        // Collect each chunk
        chunks.push(JSON.stringify(chunk));
        if (messageSource === MessageSource.CHAT) {
          const rawChunk = chunk?.additional_kwargs?.function_call?.arguments;
          if (!rawChunk) continue;

          response += rawChunk;
          if (
            response.trim().length === 0 ||
            response.trim().slice(-1) === `\\`
          )
            continue;
          const data = parse(response);
          console.log(data)
          if (state === StructuredOutputStreamState.TEXT) {
            const parsedText = data?.plainText;
            if (!parsedText) {
              continue;
            } else if (sentParsedText === parsedText) {
              state = StructuredOutputStreamState.PRODUCT;
              this.stream.emit(
                "channel" + requestUuid,
                "chunk",
                productDelimiter
              );
            } else {
              this.stream.emit(
                "channel" + requestUuid,
                "chunk",
                Streamable.getDiff(sentParsedText, parsedText)
              );
              sentParsedText = parsedText;
            }
          }
          if (state === StructuredOutputStreamState.PRODUCT) {
            for (let i = productSentCount; i < data?.products?.length; i++) {
              if (
                productsSent[productSentCount]?.product_id === undefined &&
                data?.products[productSentCount]?.recommendation
              ) {
                productsSent[productSentCount] = {
                  product_id: data?.products[productSentCount]
                    ?.product_id as string,
                  recommendation: "",
                };
                const product =
                  this.productMappings[
                    data?.products[productSentCount].product_id as string
                  ];
                this.stream.emit(
                  "channel" + requestUuid,
                  "chunk",
                  JSON.stringify({
                    name: product.title,
                    handle: product.handle,
                    image: product.image_url,
                    variants: product.variants,
                  })
                );
                this.stream.emit(
                  "channel" + requestUuid,
                  "chunk",
                  recDelimiter
                );
              }
              // product_id has been completed and recommendation has already been started
              if (productsSent[productSentCount]?.product_id) {
                if (
                  productsSent[productSentCount].recommendation ===
                  data?.products[productSentCount].recommendation
                ) {
                  productSentCount++;
                  this.stream.emit(
                    "channel" + requestUuid,
                    "chunk",
                    productDelimiter
                  );
                } else {
                  // Means we are still getting recommendation streaming
                  this.stream.emit(
                    "channel" + requestUuid,
                    "chunk",
                    Streamable.getDiff(
                      productsSent[productSentCount].recommendation!,
                      data?.products[productSentCount].recommendation
                    )
                  );
                  productsSent[productSentCount].recommendation =
                    data?.products[productSentCount].recommendation;
                  // If this product is already completed and next product has been started
                  if (i < data?.products?.length - 1) {
                    productSentCount++;
                    this.stream.emit(
                      "channel" + requestUuid,
                      "chunk",
                      productDelimiter
                    );
                  }
                }
              }
            }
          }
        } else {
          this.stream.emit("channel" + requestUuid, "chunk", chunk?.content);
        }
      }

      this.stream.emit("channel" + requestUuid, "end", "");
    } catch (error: any) {
      this.stream.emit("channel" + requestUuid, "end", "");
    }
  };
}

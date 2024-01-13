import { parse } from "best-effort-json-parser";
import type EventEmitter from "events";
import type { RunnableSequence } from "langchain/schema/runnable";
import { MessageSource } from "../../../types";

export enum StructuredOutputStreamState {
  TEXT = 1,
  PRODUCT = 2,
}

export const productDelimiter = "====PRODUCT====";

export class Streamable {
  constructor(
    private runnable: RunnableSequence,
    private stream: EventEmitter
  ) {
    this.runnable = runnable;
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
      let productSent = 0;
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
          if (state === StructuredOutputStreamState.TEXT) {
            const parsedText = data?.plainText;
            if (!parsedText) {
              continue;
            } else if (sentParsedText === parsedText) {
              state = StructuredOutputStreamState.PRODUCT;
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
            while (data?.products?.length > productSent + 1) {
              // This state means that there is at least one product that is fully parsed
              this.stream.emit(
                "channel" + requestUuid,
                "chunk",
                productDelimiter
              );
              const product = data?.products[productSent];
              this.stream.emit(
                "channel" + requestUuid,
                "chunk",
                JSON.stringify({
                  name: product.name,
                  handle: product.product_handle,
                  image: product.image,
                  variants: product.variants,
                })
              );
              productSent++;
            }
          }
        } else {
          this.stream.emit("channel" + requestUuid, "chunk", chunk?.content);
        }
      }
      while (
        messageSource === MessageSource.CHAT &&
        parse(response)?.products.length > productSent
      ) {
        // This state means that there is at least one product that is fully parsed
        this.stream.emit("channel" + requestUuid, "chunk", productDelimiter);
        const product = parse(response)?.products[productSent];
        this.stream.emit(
          "channel" + requestUuid,
          "chunk",
          JSON.stringify({
            name: product.name,
            handle: product.product_handle,
            image: product.image,
            variants: product.variants,
          })
        );
        productSent++;
      }

      this.stream.emit("channel" + requestUuid, "end", "");
    } catch (error: any) {
      // TODO: close stream
    }
  };
}

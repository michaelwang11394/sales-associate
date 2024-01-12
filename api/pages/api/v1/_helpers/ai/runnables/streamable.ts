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
        console.log(JSON.stringify(chunk));
        if (messageSource === MessageSource.CHAT) {
          const rawChunk = chunk?.additional_kwargs?.function_call?.arguments;
          if (!rawChunk) continue;

          response += rawChunk;
          console.log("raw response", response);
          if (
            response.trim().length === 0 ||
            response.trim().slice(-1) === `\\`
          )
            continue;
          const data = parse(response);
          console.log("best effort parsed", JSON.stringify(data));
          if (state === StructuredOutputStreamState.TEXT) {
            console.log("in state text");
            const parsedText = data?.plainText;
            console.log("before emit", parsedText);
            if (!parsedText) {
              continue;
            } else if (sentParsedText === parsedText) {
              state = StructuredOutputStreamState.PRODUCT;
              console.log("Moved to product");
            } else {
              this.stream.emit(
                "channel" + requestUuid,
                "chunk",
                Streamable.getDiff(sentParsedText, parsedText)
              );
              console.log(
                "emitted",
                Streamable.getDiff(sentParsedText, parsedText)
              );
              sentParsedText = parsedText;
            }
          }
          if (state === StructuredOutputStreamState.PRODUCT) {
            console.log("in state product");
            while (data?.products?.length > productSent + 1) {
              // This state means that there is at least one product that is fully parsed
              this.stream.emit(
                "channel" + requestUuid,
                "chunk",
                productDelimiter
              );
              this.stream.emit(
                "channel" + requestUuid,
                "chunk",
                data?.products[productSent].product_handle
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
        this.stream.emit(
          "channel" + requestUuid,
          "chunk",
          parse(response)?.products[productSent].product_handle
        );
        productSent++;
      }

      this.stream.emit("channel" + requestUuid, "end", "");
    } catch (error: any) {
      // TODO: close stream
    }
  };
}

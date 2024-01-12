import type EventEmitter from "events";
import type { RunnableSequence } from "langchain/schema/runnable";
import { MessageSource } from "../../../types";

export class Streamable {
  constructor(
    private runnable: RunnableSequence,
    private stream: EventEmitter
  ) {
    this.runnable = runnable;
    this.stream = stream;
  }

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

      for await (const chunk of res) {
        // Collect each chunk
        chunks.push(JSON.stringify(chunk));
        console.log(chunk?.content);
        this.stream.emit(
          "channel" + requestUuid,
          "chunk",
          messageSource === MessageSource.CHAT
            ? chunk?.additional_kwargs?.function_call?.arguments
            : chunk?.content
        );
      }

      this.stream.emit("channel" + requestUuid, "end", "");
    } catch (error: any) {
      // TODO: close stream
    }
  };
}

import type { RunnableSequence } from "langchain/schema/runnable";

export class Runnable {
  constructor(private runnable: RunnableSequence) {
    this.runnable = runnable;
  }

  public run = async (
    input: string,
    store: string,
    clientId: string,
    requestUuid: string
  ) => {
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
      return res;
    } catch (error: any) {
      throw error;
    }
  };
}

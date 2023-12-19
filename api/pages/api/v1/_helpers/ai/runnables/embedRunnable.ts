import { RunnableSequence } from "langchain/schema/runnable";
import { getProducts } from "../../shopify";
import { runEmbeddingsAndSearch } from "../embeddings";

export const createEmbedRunnable = async (store: string) => {
  const { metadataIds, strippedProducts } = await getProducts(store);
  return RunnableSequence.from([
    {
      catalog: async (input) =>
        await runEmbeddingsAndSearch(
          store,
          input.input,
          strippedProducts,
          metadataIds
        ),
      input: (input) => input.input,
    },
    {
      input: (previousOutput) =>
        previousOutput.catalog.join("\r\n") + previousOutput.input,
    },
  ]);
};

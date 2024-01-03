import {
  RunnablePassthrough,
  RunnableSequence,
} from "langchain/schema/runnable";
import { getProducts } from "../../shopify";
import { runEmbeddingsAndSearch } from "../embeddings";

export const createEmbedRunnable = async (store: string) => {
  const { metadataIds, strippedProducts } = await getProducts(store);
  return RunnableSequence.from([
    RunnablePassthrough.assign({
      catalog: async (input) =>
        await runEmbeddingsAndSearch(
          store,
          // @ts-ignore
          input.input,
          strippedProducts,
          metadataIds
        ),
    }),
    RunnablePassthrough.assign({
      products: (previousOutput) =>
        // @ts-ignore
        "Here are relevant products\n" + previousOutput.catalog.join("\r\n"),
    }),
  ]);
};

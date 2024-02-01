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
      products: (previousOutput) => {
        // @ts-ignore
        const products = previousOutput.catalog;
        let productDetails = "Here are relevant products:\n";
        // Remove Duplicates
        const uniqueProductDetails = new Set();
        //@ts-ignore
        products.forEach((product) => {
          const title = product.match(/title: (.*)/)[1];
          const description = product.match(/description: (.*)/)[1];
          const uniqueKey = `Title: ${title}, Description: ${description}`;
          uniqueProductDetails.add(uniqueKey);
        });
        uniqueProductDetails.forEach((detail) => {
          productDetails += `${detail}\n`;
        });
        return productDetails;
      },
    }),
  ]);
};

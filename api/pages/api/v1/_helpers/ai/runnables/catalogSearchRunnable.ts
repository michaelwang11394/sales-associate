import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { getProducts } from "../../shopify";
import { simpleSearchModelConfig } from "../llmConfig";

// Narrow down relevant products by asking LLM directly
export const createSimpleSearchRunnable = async (store: string) => {
  const { strippedProducts } = await getProducts(store);

  const productChain = RunnableSequence.from([
    {
      catalog: () => strippedProducts.join("\r\n"),
      input: (input) => {
        return input.input;
      },
    },
    {
      res: (previousOutput) =>
        PromptTemplate.fromTemplate(
          `You are given a store product catalog and a user question. If the user is asking a question about products, return information on all relevant products. If the user is not asking a question about products, simply return "none".\n Here is the {catalog}.\nHere is the user question {input}`
        )
          .format(previousOutput)
          .then(
            async (formatted_prompt) =>
              await new ChatOpenAI(simpleSearchModelConfig()).invoke(
                formatted_prompt
              )
          ),
      input: (previousOutput) => previousOutput.input,
    },
    {
      input: (previousOutput) => {
        return previousOutput.res.content !== "none"
          ? previousOutput.res.content + "\n" + previousOutput.input
          : previousOutput.input;
      },
    },
  ]);
  return productChain;
};

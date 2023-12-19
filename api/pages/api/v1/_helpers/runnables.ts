import type { BufferMemory } from "langchain/memory";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { zodToJsonSchema } from "zod-to-json-schema";
import { OPENAI_RETRIES } from "../constants";
import { HallucinationError, HalluctinationCheckSeverity } from "../types";
import { runEmbeddingsAndSearch } from "./embeddings";
import { chatProductModel, chatSalesModel, zodSchema } from "./llmConfig";
import { getProducts, isValidProduct } from "./shopify";
import type { LLMConfigType } from "./types";

export class RunnableWithMemory {
  constructor(
    private runnable: RunnableSequence,
    private memory: BufferMemory,
    private hallucinationSeverity: HalluctinationCheckSeverity
  ) {
    this.runnable = runnable;
    this.memory = memory;
    this.hallucinationSeverity = hallucinationSeverity;
  }

  private runPrivate = async (
    input: string,
    store: string,
    retry_left: number
  ): Promise<{ valid: string; product: string }> => {
    if (retry_left === 0) {
      throw new Error("openai retries exceeded");
    }
    try {
      const res = await this.runnable.invoke({ input: input });
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

      await this.memory.saveContext(
        { input: input },
        { output: res.plainText + JSON.stringify(res.products) }
      );
      return res;
    } catch (error: any) {
      if (error instanceof HallucinationError) {
        switch (this.hallucinationSeverity) {
          case HalluctinationCheckSeverity.FAIL:
            throw error;
          case HalluctinationCheckSeverity.RETRY:
            // Means openai function parsing or hallucination failed, retry
            return this.runPrivate(input, store, retry_left - 1);
          case HalluctinationCheckSeverity.FILTER:
          case HalluctinationCheckSeverity.NONE:
            throw new Error("Hallucination is not handled correctly");
        }
      } else if (error instanceof SyntaxError) {
        // Means openai function parsing or hallucination failed, retry
        return this.runPrivate(input, store, retry_left - 1);
      } else {
        throw error;
      }
    }
  };

  public run = async (input: string, store: string) => {
    return await this.runPrivate(input, store, OPENAI_RETRIES);
  };
}
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
              await chatProductModel.invoke(formatted_prompt)
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
export const createFinalRunnable = async (
  context: string[],
  llmConfig: LLMConfigType,
  memory: BufferMemory,
  previous_chain?: RunnableSequence // If chaining, what is the previous chain
) => {
  const systemTemplate = llmConfig.prompt;

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const formattedSystemMessagePrompt = await systemMessagePrompt.format({
    context: context,
  });

  const chatPrompt = ChatPromptTemplate.fromMessages([
    formattedSystemMessagePrompt,
    new MessagesPlaceholder("history"),
    ["user", "{input}"],
  ]);

  // Binding "function_call" below makes the model always call the specified function.
  // If you want to allow the model to call functions selectively, omit it.
  const functionCallingModel = chatSalesModel.bind({
    functions: [
      {
        name: "output_formatter",
        description: "Should always be used to properly format output",
        parameters: zodToJsonSchema(zodSchema),
      },
    ],
    function_call: { name: "output_formatter" },
  });

  const outputParser = new JsonOutputFunctionsParser();

  const salesChain = RunnableSequence.from([
    {
      input: (initialInput) => {
        return initialInput.input;
      },
      memory: () => memory.loadMemoryVariables({}),
    },
    {
      input: (previousOutput) => {
        return previousOutput.input;
      },
      history: (previousOutput) => {
        const mem = previousOutput.memory.history;
        return mem;
      },
    },
    chatPrompt.pipe(functionCallingModel).pipe(outputParser),
  ]);

  return previous_chain ? previous_chain.pipe(salesChain) : salesChain;
};

import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { BufferMemory } from "langchain/memory";
import { BufferWindowMemory, ChatMessageHistory } from "langchain/memory";
import { HumanMessage, AIMessage } from "langchain/schema";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import {
  hasItemsInCart,
  hasViewedProducts,
  isNewCustomer,
  supabase,
} from "./supabase";
import { getProducts, isValidProduct } from "./shopify";
import { RunnableSequence } from "langchain/schema/runnable";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import {
  BACK_FORTH_MEMORY_LIMIT,
  OPENAI_RETRIES,
  OPENAI_KEY,
  RETURN_TOP_N_SIMILARITY_DOCS,
} from "@/constants/constants";
import { SenderType, HallucinationError } from "@/constants/types";
import {
  HalluctinationCheckSeverity,
  type FormattedMessage,
} from "@/constants/types";
export enum MessageSource {
  EMBED, // Pop up greeting in app embed
  CHAT, // Conversation/thread with customer
}

interface LLMConfigType {
  prompt: string;
  include_embeddings: boolean;
  validate_hallucination: HalluctinationCheckSeverity;
}

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

  private runPrivate = async (input: string, retry_left: number) => {
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
          res.products.map(async (product) => {
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
              (await isValidProduct(product.product_handle));
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
      console.log(await this.memory.loadMemoryVariables({}));
      return res;
    } catch (error: any) {
      if (error instanceof HallucinationError) {
        switch (this.hallucinationSeverity) {
          case HalluctinationCheckSeverity.FAIL:
            throw error;
          case HalluctinationCheckSeverity.RETRY:
            // Means openai function parsing or hallucination failed, retry
            console.log("OpenAI hallucination detected, trying again");
            return this.runPrivate(input, retry_left - 1);
          case HalluctinationCheckSeverity.FILTER:
          case HalluctinationCheckSeverity.NONE:
            throw new Error("Hallucination is not handled correctly");
        }
      } else if (error instanceof SyntaxError) {
        // Means openai function parsing or hallucination failed, retry
        console.log("OpenAI function parsing failed, trying again");
        return this.runPrivate(input, retry_left - 1);
      } else {
        throw error;
      }
    }
  };

  public run = async (input: string) => {
    return await this.runPrivate(input, OPENAI_RETRIES);
  };
}

const LLMConfig: Record<MessageSource, LLMConfigType> = {
  [MessageSource.CHAT]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's question.\nHere is user-specific context if any:{context}.\nIf the question is not related to the store or its products, apologize and ask if you can help them another way. Keep responses to less than 150 characters for the plainText field and readable`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
  [MessageSource.EMBED]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's request.\nHere is user-specific context if any:{context}\n. Keep all responses to less than 100 characters.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
};

const zodSchema = z.object({
  plainText: z.string().describe("The response directly displayed to user"),
  products: z
    .array(
      z.object({
        name: z.string().describe("The name of the product"),
        product_handle: z.string().describe("The product handle"),
        image: z
          .string()
          .includes("cdn.shopify.com", {
            message: "Must include cdn.shopify.com",
          })
          .describe(
            "The image url of the product. Must include cdn.shopify.com"
          ),
        variants: z
          .array(
            z
              .object({
                title: z.string().describe("The title of this variant"),
                price: z.number().describe("The price of the product"),
                featured_image: z
                  .string()
                  .url()
                  .describe("The featured image of the product variant"),
              })
              .describe("A variant of product that has a specific price")
          )
          .describe("Array of variants of product if not empty")
          .optional(),
      })
    )
    .describe("A list of products mentioned in the response, if any"),
});

const chatSalesModel = new ChatOpenAI({
  openAIApiKey: OPENAI_KEY,
  temperature: 0.7,
  modelName: "gpt-3.5-turbo",
});

const chatProductModel = new ChatOpenAI({
  openAIApiKey: OPENAI_KEY,
  temperature: 1.0,
  modelName: "gpt-3.5-turbo-16k",
});

// TODO: Move createCatalogEmbeddings to app home once we create that.
const runEmbeddingsAndSearch = async (query, document, uids) => {
  // const res = await createCatalogEmbeddings();
  // console.log(res);
  let vectorStore;
  try {
    vectorStore = new SupabaseVectorStore(
      new OpenAIEmbeddings({ openAIApiKey: OPENAI_KEY }),
      {
        client: supabase,
        tableName: "vector_catalog",
        queryName: "search_catalog",
      }
    );
  } catch (error) {
    console.log(error);
    console.log("memory vector");
    vectorStore = await MemoryVectorStore.fromTexts(
      document,
      uids,
      new OpenAIEmbeddings({
        openAIApiKey: OPENAI_KEY,
      })
    );
  }

  const relevantDocs = await vectorStore.similaritySearch(query, 3);

  return relevantDocs
    .map((doc) => doc.pageContent)
    .slice(0, RETURN_TOP_N_SIMILARITY_DOCS);
};

// Narrow down relevant products by asking LLM directly
const createSimpleSearchRunnable = async () => {
  const { strippedProducts } = await getProducts();

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

const createEmbedRunnable = async () => {
  const { metadataIds, strippedProducts } = await getProducts();
  return RunnableSequence.from([
    {
      catalog: async (input) =>
        await runEmbeddingsAndSearch(
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

const createFinalRunnable = async (
  context: string[],
  llmConfig: LLMConfigType,
  memory: BufferMemory,
  previous_chain? // If chaining, what is the previous chain
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

/* CALLING FUNCTION */
export const createOpenaiWithHistory = async (
  clientId: string,
  messageSource: MessageSource,
  messages: FormattedMessage[] = []
) => {
  /* CUSTOMER INFORMATION CONTEXT */
  let customerContext: string[] = [];

  // Check if the customer is new
  const newCustomer = await isNewCustomer(clientId);
  customerContext.push(newCustomer.message);

  // If customer is not new, check their cart history and product_viewed history. Add relevant links
  if (newCustomer.isNew === false) {
    const itemsInCart = await hasItemsInCart(clientId);
    const productsViewed = await hasViewedProducts(clientId, 5);

    // Check if the customer has items in their cart
    if (itemsInCart.hasItems === true) {
      customerContext.push(itemsInCart.message);
      customerContext.push(itemsInCart.cartURL!);
    }

    // Check if the customer has viewed any products
    if (productsViewed.hasViewed === true) {
      customerContext.push(productsViewed.message);
      customerContext.push(productsViewed.productURLs!);
    }
  }
  const history = messages.map((m) =>
    m.sender === SenderType.USER
      ? new HumanMessage(m.content)
      : new AIMessage(m.content)
  );

  return await createOpenai(customerContext, messageSource, history);
};

const createOpenai = async (
  context: string[],
  messageSource: MessageSource,
  history: (HumanMessage | AIMessage)[] = []
) => {
  const llmConfig = LLMConfig[messageSource];

  // This memory will only store the input and the FINAL output. If chains are linked, intermediate output will not be recorded here
  const memory = new BufferWindowMemory({
    chatHistory: new ChatMessageHistory(history),
    inputKey: "input",
    outputKey: "output",
    k: BACK_FORTH_MEMORY_LIMIT, // Note this is k back and forth (naively assumes that human and ai have one message each) so its double the number here
    memoryKey: "history",
    returnMessages: true,
  });

  const finalChain = await createFinalRunnable(
    context,
    llmConfig,
    memory,
    llmConfig.include_embeddings
      ? await createEmbedRunnable()
      : await createSimpleSearchRunnable()
  );

  return new RunnableWithMemory(
    finalChain,
    memory,
    llmConfig.validate_hallucination
  );
};

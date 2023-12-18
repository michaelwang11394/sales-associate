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
import { RunnableSequence } from "langchain/schema/runnable";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import "@shopify/shopify-api/adapters/node";

import {
  MESSAGES_HISTORY_LIMIT,
  OPENAI_RETRIES,
  OPENAI_KEY,
  RETURN_TOP_N_SIMILARITY_DOCS,
  RECENTLY_VIEWED_PRODUCTS_COUNT,
} from "../constants";
import {
  HalluctinationCheckSeverity,
  type FormattedMessage,
  MessageSource,
  HallucinationError,
  SenderType,
} from "../types";
import {
  getMessagesFromIds,
  hasItemsInCart,
  hasViewedProducts,
  isNewCustomer,
  supabase,
} from "./supabase";
import { LATEST_API_VERSION, shopifyApi } from "@shopify/shopify-api";
import { SupabaseSessionStorage } from "./supabase.session";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  apiVersion: LATEST_API_VERSION,
  scopes: ["read_products"],
  hostName: process.env.VERCEL_HOST ?? "sales-associate-backend.vercel.app",
  hostScheme: process.env.VERCEL_HOST === undefined ? "https" : "http",
  isEmbeddedApp: false,
});

const createClient = async (store: string) => {
  const session = (
    await new SupabaseSessionStorage().findSessionsByShop(stripHttps(store))
  )[0];
  const client = new shopify.clients.Rest({
    session,
    apiVersion: LATEST_API_VERSION,
  });
  return client;
};

const formatCatalogEntry = (product: any) => {
  // Fields we care about
  const {
    id,
    title,
    body_html: description,
    handle,
    images,
    variants,
  } = product;
  // There's a image for each variant if any, otherwise it's an array of a single element
  const formattedVariants = variants?.map((variant: any) => {
    return {
      id: variant.id,
      price: variant.price,
      product_id: variant.product_id,
      title: variant.title,
    };
  });
  const image_url = images.length > 0 ? images[0].src : "";
  return {
    id,
    title,
    description,
    handle,
    image_url,
    variants: formattedVariants,
  };
};

// Session storage's store column does not have this
function stripHttps(url: string): string {
  if (url.startsWith("https://")) {
    return url.slice("https://".length);
  }
  return url;
}

export const getProducts = async (store: string, limit = 250) => {
  const data = (
    await (
      await createClient(store)
    ).get<any>({
      path: "products",
    })
  ).body;
  if (data.products === undefined) {
    console.error("No catalog exists");
    // throw new Error("No catalog exists")
  }
  const formattedProducts = data.products.map((product: any) =>
    formatCatalogEntry(product)
  );

  const stringifiedProducts = formattedProducts
    .map((product: any) => JSON.stringify(product))
    .join("\r\n");

  // RAG and embeddings pre-processing
  const metadataIds = formattedProducts.map((product: any) => product.id);
  const strippedProducts = formattedProducts.map((product: any) => {
    // Convert each product object to a string, remove quotes, newlines, and 'id'. Possibly remove brackets in the future too
    return JSON.stringify(product).replace(/"/g, "").replace(/\n/g, " ");
  });

  return { stringifiedProducts, metadataIds, strippedProducts };
};

export const isValidProduct = async (
  store: string,
  handle: string
): Promise<boolean> => {
  const data = (
    await (
      await createClient(store)
    ).get<any>({
      path: "products",
      query: { store: store, handle: handle },
    })
  ).body;
  return data.products.length > 0;
};

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
            return this.runPrivate(input, store, retry_left - 1);
          case HalluctinationCheckSeverity.FILTER:
          case HalluctinationCheckSeverity.NONE:
            throw new Error("Hallucination is not handled correctly");
        }
      } else if (error instanceof SyntaxError) {
        // Means openai function parsing or hallucination failed, retry
        console.log("OpenAI function parsing failed, trying again");
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
const runEmbeddingsAndSearch = async (
  store: string,
  query: string,
  document: string[],
  uids: string[]
) => {
  // const res = await createCatalogEmbeddings();
  // console.log(res);
  let vectorStore;
  let relevantDocs;
  try {
    vectorStore = new SupabaseVectorStore(
      new OpenAIEmbeddings({ openAIApiKey: OPENAI_KEY }),
      {
        client: supabase,
        tableName: "vector_catalog",
        queryName: "match_documents",
        filter: { metadata: { $eq: store } },
      }
    );
    relevantDocs = await vectorStore.similaritySearch(
      query,
      RETURN_TOP_N_SIMILARITY_DOCS
    );

    // If no docs are returned, means that we need to create embeddings
    if (relevantDocs.length === 0) {
      const { strippedProducts } = await getProducts(store);
      // Delete existing indices first
      const { error } = await supabase
        .from("vector_catalog")
        .delete()
        .eq("metadata", store);
      if (error) {
        throw new Error("error updating vector table in supabase");
      }

      vectorStore = await SupabaseVectorStore.fromTexts(
        strippedProducts,
        Array(strippedProducts.length).fill(store),
        new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_KEY }),
        {
          client: supabase,
          tableName: "vector_catalog",
          queryName: "match_documents",
        }
      );
      relevantDocs = await vectorStore.similaritySearch(
        query,
        RETURN_TOP_N_SIMILARITY_DOCS
      );
      if (relevantDocs.length === 0) {
        throw new Error("Search after index creation returned 0 results");
      }
    }
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
    relevantDocs = await vectorStore.similaritySearch(
      query,
      RETURN_TOP_N_SIMILARITY_DOCS
    );
  }

  return relevantDocs.map((doc) => doc.pageContent);
};

// Narrow down relevant products by asking LLM directly
const createSimpleSearchRunnable = async (store: string) => {
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

const createEmbedRunnable = async (store: string) => {
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

const createFinalRunnable = async (
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

const createOpenaiWithHistory = async (
  input: string,
  store: string,
  clientId: string,
  messageSource: MessageSource,
  messages: FormattedMessage[] = []
) => {
  /* CUSTOMER INFORMATION CONTEXT */
  let customerContext: string[] = [];

  // Check if the customer is new
  const newCustomer = await isNewCustomer(store, clientId);
  customerContext.push(newCustomer.message);

  // If customer is not new, check their cart history and product_viewed history. Add relevant links
  if (newCustomer.isNew === false) {
    const itemsInCart = await hasItemsInCart(store, clientId);
    const productsViewed = await hasViewedProducts(
      store,
      clientId,
      RECENTLY_VIEWED_PRODUCTS_COUNT
    );

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

  return await createOpenai(
    input,
    store,
    customerContext,
    messageSource,
    history
  );
};

const createOpenai = async (
  input: string,
  store: string,
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
    k: MESSAGES_HISTORY_LIMIT / 2, // Note this is k back and forth (naively assumes that human and ai have one message each) so its double the number here
    memoryKey: "history",
    returnMessages: true,
  });

  const finalChain = await createFinalRunnable(
    context,
    llmConfig,
    memory,
    llmConfig.include_embeddings
      ? await createEmbedRunnable(store)
      : await createSimpleSearchRunnable(store)
  );

  const runnable = new RunnableWithMemory(
    finalChain,
    memory,
    llmConfig.validate_hallucination
  );
  const response = await runnable.run(input, store);
  return { show: true, openai: response };
};

export const callOpenai = async (
  input: string,
  store: string,
  clientId: string,
  source: MessageSource,
  messageIds: string[] | undefined
) => {
  // Some weird Typescript issue where I can't use lambda, convert with for loop
  const numberArray: number[] = [];

  for (let i = 0; messageIds !== undefined && i < messageIds?.length; i++) {
    numberArray.push(parseInt(messageIds[i], 10));
  }

  // At this point user input should already be in messages, hence the + 1
  const { success, data } = await getMessagesFromIds(
    store,
    clientId,
    numberArray
  );
  if (!success || !data) {
    throw new Error(
      "message history could not be retrieved or not all ids could be matched"
    );
  }

  return await createOpenaiWithHistory(
    input,
    store,
    clientId,
    source,
    data.slice(0, MESSAGES_HISTORY_LIMIT)
  );
};

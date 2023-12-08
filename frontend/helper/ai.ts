import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  BufferMemory,
  BufferWindowMemory,
  ChatMessageHistory,
} from "langchain/memory";
import { HumanMessage, AIMessage } from "langchain/schema";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { hasItemsInCart, hasViewedProducts, isNewCustomer } from "./supabase"; // Updated reference to refactored supabase functions
import { getProducts } from "./shopify"; // Updated reference to refactored shopify function
import {
  RunnablePassthrough,
  RunnableSequence,
} from "langchain/schema/runnable";

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { formatDocumentsAsString } from "langchain/util/document";

export enum MessageSource {
  EMBED, // Pop up greeting in app embed
  CHAT, // Conversation/thread with customer
}

interface LLMConfigType {
  prompt: string;
  include_embedding: boolean;
  include_catalog: boolean;
  include_context: boolean;
  include_navigation?: boolean; // Assuming this property is optional
}

export class RunnableWithMemory {
  constructor(
    private runnable: RunnableSequence,
    private memory: BufferMemory
  ) {
    this.runnable = runnable;
    this.memory = memory;
  }

  public run = async (input: string) => {
    const res = await this.runnable.invoke({ input: input });
    await this.memory.saveContext(
      { input: input },
      { output: res.plainText + JSON.stringify(res.products) }
    );
    console.log(await this.memory.loadMemoryVariables({}));
    return res;
  };
}

const LLMConfig: Record<MessageSource, LLMConfigType> = {
  [MessageSource.CHAT]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's question.\n Here is the store's inventory {inventory}.\nHere is user-specific context if any:{context}.\nIf the question is not related to the store or its products, apologize and ask if you can help them another way. Keep responses to less than 150 characters for the plainText field and readable`,
    include_embedding: false,
    include_catalog: false,
    include_context: true,
  },
  [MessageSource.EMBED]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's request.\n Here is the store's inventory {inventory}.\nHere is user-specific context if any:{context}\n. Keep all responses to less than 100 characters.`,
    include_embedding: false,
    include_catalog: false,
    include_context: true,
  },
};

const zodSchema = z.object({
  plainText: z.string().describe("The response directly displayed to user"),
  products: z
    .array(
      z.object({
        name: z.string().describe("The name of the product"),
        product_handle: z.string().describe("The product handle"),
        image_src: z
          .string()
          .url()
          .describe("The image source url of the product"),
        variants: z
          .array(
            z
              .object({
                title: z.string().describe("The title of this variant"),
                price: z.number().describe("The price of the product"),
                variant_image_src: z
                  .string()
                  .url()
                  .describe("The image source url of the product variant"),
              })
              .describe("A variant of product that has a specific price")
          )
          .describe("Array of variants of product if not empty")
          .optional(),
      })
    )
    .describe("A list of products mentioned in the response, if any"),
});

/* CHATS 
// HACK: Replace key after migration to nextjs
*/
const chatModel = new ChatOpenAI({
  openAIApiKey: "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",
  temperature: 0.7,
  modelName: "gpt-3.5-turbo-16k",
});

export const formatMessage = (text, source) => {
  const title = source !== "user" ? "Sales Associate" : "";
  const position = source !== "user" ? "left" : "right";
  const messageType = "text";
  const avatar =
    source !== "user"
      ? "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1061&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      : "";

  //TODO: Download photo locally
  const message = {
    position: position,
    type: messageType,
    title: title,
    text: text,
    avatar: avatar,
    source: source,
  };
  return message;
};

/* CALLING FUNCTION */
export const createOpenaiWithHistory = async (
  clientId,
  messageSource: MessageSource,
  messages = []
) => {
  /* CUSTOMER INFORMATION CONTEXT */
  let customerContext = [];

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
      customerContext.push(itemsInCart.cartURL);
    }

    // Check if the customer has viewed any products
    if (productsViewed.hasViewed === true) {
      customerContext.push(productsViewed.message);
      customerContext.push(productsViewed.productURLs);
    }
  }

  const history = messages.map((m) =>
    m.source === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)
  );

  return await createOpenai(customerContext, messageSource, history);
};

const createOpenai = async (
  context,
  messageSource: MessageSource,
  history: (HumanMessage | AIMessage)[] = []
) => {
  console.log(messageSource);
  const llmConfig = LLMConfig[messageSource];
  console.log(llmConfig);
  const systemTemplate = llmConfig.prompt;
  let inventory = llmConfig.include_catalog
    ? "Here is a full catalog of products:\n" + (await getProducts())
    : "";
  // TODO @michaelwang11394 add embedding data here
  inventory += llmConfig.include_embedding
    ? "Here are some highly relevant products:\n" + ""
    : "";

  /* 
  RAG Search
  TODO: Store in proper vector table, create index.
  */
  // Pre-process products for embedding
  const { metadataIds, strippedProducts } = await getProducts();
  console.log(
    "types",
    typeof metadataIds,
    typeof strippedProducts,
    strippedProducts
  );

  const vectorStore = await MemoryVectorStore.fromTexts(
    strippedProducts,
    metadataIds,
    new OpenAIEmbeddings({
      openAIApiKey: "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",
    })
  );
  console.log("vector store", vectorStore);
  // const retriever = vectorStore.similaritySearch("snowboards", 1);
  const retriever = vectorStore.asRetriever();

  console.log("retriever", retriever);

  const productTemplate = `You are given a store product catalog and a user question. If the user is asking a question about products, return information on all relevant products. If the user is not asking a question about products, return "Unrelated to products".\n Here is the {catalog}.\nHere is the user question {userInput}`;
  const PRODUCT_PROMPT = PromptTemplate.fromTemplate(productTemplate);

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const formattedSystemMessagePrompt = await systemMessagePrompt.format({
    context: llmConfig.include_navigation ? context : "",
    inventory: inventory,
  });

  const chatPrompt = ChatPromptTemplate.fromMessages([
    formattedSystemMessagePrompt,
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
  ]);

  const memory = new BufferMemory({
    chatHistory: new ChatMessageHistory(history),
    inputKey: "input",
    outputKey: "output",
    memoryKey: "history",
    returnMessages: true,
  });

  // Binding "function_call" below makes the model always call the specified function.
  // If you want to allow the model to call functions selectively, omit it.
  const functionCallingModel = chatModel.bind({
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

  const productChain = RunnableSequence.from([
    {
      catalog: retriever.pipe(formatDocumentsAsString),
      userInput: () => {
        const res2 = new RunnablePassthrough();
        console.log("retriever userinput", res2);
        return res2;
      },
    },
    PRODUCT_PROMPT,
    chatModel,
  ]);

  console.log("product chain", productChain);

  //add product catalog here?
  const salesChain = RunnableSequence.from([
    {
      input: (initialInput) => initialInput.input,
      memory: () => memory.loadMemoryVariables({}),
    },
    {
      input: (previousOutput) => previousOutput.input,
      history: (previousOutput) => previousOutput.memory.history,
    },

    chatPrompt.pipe(functionCallingModel).pipe(outputParser),
  ]);

  const finalChain = productChain.pipe(salesChain);

  return new RunnableWithMemory(finalChain, memory);
};

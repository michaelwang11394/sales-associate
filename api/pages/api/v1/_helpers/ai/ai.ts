import "@shopify/shopify-api/adapters/node";
import {
  ChatMessageHistory,
  ConversationSummaryBufferMemory,
} from "langchain/memory";
import { AIMessage, HumanMessage } from "langchain/schema";

import { ChatOpenAI } from "langchain/chat_models/openai";
import { RECENTLY_VIEWED_PRODUCTS_COUNT } from "../../constants";
import type { FormattedMessage, MessageSource } from "../../types";
import { SenderType } from "../../types";
import {
  getMessagesFromIds,
  hasItemsInCart,
  hasViewedProducts,
  isNewCustomer,
} from "../supabase_queries";
import { MESSAGE_SUMMARY_FLUSH_THRESHOLD } from "./constants";
import { LLMConfig, summarizeHistoryModelConfig } from "./llmConfig";
import { createSimpleSearchRunnable } from "./runnables/catalogSearchRunnable";
import { createFinalRunnable } from "./runnables/createFinalRunnable";
import { createEmbedRunnable } from "./runnables/embedRunnable";
import { RunnableWithMemory } from "./runnables/types";

const createOpenaiWithHistory = async (
  input: string,
  store: string,
  clientId: string,
  requestUuid: string,
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
    clientId,
    requestUuid,
    history
  );
};

const createOpenai = async (
  input: string,
  store: string,
  context: string[],
  messageSource: MessageSource,
  clientId: string,
  requestUuid: string,
  history: (HumanMessage | AIMessage)[] = []
) => {
  const llmConfig = LLMConfig[messageSource];

  // This memory will only store the input and the FINAL output. If chains are linked, intermediate output will not be recorded here
  const memory = new ConversationSummaryBufferMemory({
    chatHistory: new ChatMessageHistory(history),
    maxTokenLimit: MESSAGE_SUMMARY_FLUSH_THRESHOLD,
    llm: new ChatOpenAI(summarizeHistoryModelConfig()),
    returnMessages: true,
  });

  // Langchain quirk, the summarization and threshold enforce only happens on saveContext. Since we instantiate memory on every request, we need to prune here
  await memory.prune();

  const finalChain = await createFinalRunnable(
    context,
    llmConfig,
    memory,
    messageSource,
    llmConfig.include_embeddings
      ? await createEmbedRunnable(store)
      : await createSimpleSearchRunnable(store)
  );

  const runnable = new RunnableWithMemory(
    finalChain,
    memory,
    llmConfig.validate_hallucination
  );
  const response = await runnable.run(input, store, clientId, requestUuid);
  return { show: true, openai: response };
};

export const callOpenai = async (
  input: string,
  store: string,
  clientId: string,
  requestUuid: string,
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
    requestUuid,
    source,
    data // Pass in all messages for summary
  );
};

import "@shopify/shopify-api/adapters/node";
import { BufferWindowMemory, ChatMessageHistory } from "langchain/memory";
import { AIMessage, HumanMessage } from "langchain/schema";

import {
  MESSAGES_HISTORY_LIMIT,
  RECENTLY_VIEWED_PRODUCTS_COUNT,
} from "../../constants";
import type { FormattedMessage, MessageSource } from "../../types";
import { SenderType } from "../../types";
import {
  getMessagesFromIds,
  hasItemsInCart,
  hasViewedProducts,
  isNewCustomer,
} from "../supabase_queries";
import { LLMConfig } from "./llmConfig";
import { createSimpleSearchRunnable } from "./runnables/catalogSearchRunnable";
import { createFinalRunnable } from "./runnables/createFinalRunnable";
import { createEmbedRunnable } from "./runnables/embedRunnable";
import { RunnableWithMemory } from "./runnables/types";

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
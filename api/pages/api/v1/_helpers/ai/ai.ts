import "@shopify/shopify-api/adapters/node";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatMessageHistory,
  ConversationSummaryBufferMemory,
} from "langchain/memory";
import { AIMessage, HumanMessage } from "langchain/schema";

import type { EventEmitter } from "events";
import { RECENTLY_VIEWED_PRODUCTS_COUNT } from "../../constants";
import { MessageSource, SenderType } from "../../types";
import { computeBestSellers } from "../shopify";
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
import { Runnable } from "./runnables/runnable";
import { Streamable } from "./runnables/streamable";

export const callOpenai = async (
  input: string,
  store: string,
  clientId: string,
  requestUuid: string,
  source: MessageSource,
  messageIds: string[] | undefined,
  streamWriter?: EventEmitter
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
    console.error(numberArray);
    throw new Error(
      "message history could not be retrieved or not all ids could be matched"
    );
  }
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
    }
  }

  // Add best sellers from past two weeks ago
  const bestSellers = await computeBestSellers(store);
  if (bestSellers.length > 0) {
    customerContext.push(
      "The following are the top selling products of the store, ranked in descending popularity"
    );
    customerContext.push(bestSellers.join("\r\n"));
  }

  const history = data.map((m) =>
    m.sender === SenderType.USER
      ? new HumanMessage(m.content)
      : new AIMessage(m.content)
  );
  const llmConfig = LLMConfig[source];

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
    customerContext,
    llmConfig,
    memory,
    source,
    llmConfig.include_embeddings
      ? await createEmbedRunnable(store)
      : await createSimpleSearchRunnable(store)
  );

  const response =
    source === MessageSource.HINTS
      ? await new Runnable(finalChain).run(input, store, clientId, requestUuid)
      : await new Streamable(finalChain, streamWriter!).run(
          input,
          store,
          source,
          clientId,
          requestUuid
        );
  return { show: true, openai: response };
};

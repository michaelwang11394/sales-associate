import "@shopify/shopify-api/adapters/node";

import type { EventEmitter } from "events";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import {
  RECENTLY_VIEWED_PRODUCTS_COUNT,
  SUPABASE_MESSAGES_RETRIEVED,
} from "../../constants";
import { MessageSource, SenderType } from "../../types";
import { getProducts } from "../shopify";
import {
  getMessages,
  hasViewedProducts,
  insertMessage,
  isNewCustomer
} from "../supabase_queries";
import { runEmbeddingsAndSearch } from "./embeddings";
import { LLMConfig, summarizeHistoryModelConfig } from "./llmConfig";
import { createFinalRunnable } from "./runnables/createFinalRunnable";
import { Runnable } from "./runnables/runnable";
import { Streamable } from "./runnables/streamable";

export const summarizeHistory = async (
  store: string,
  clientId: string,
  requestUuid: string
) => {
  const { data } = await getMessages(
    store,
    clientId,
    true,
    SUPABASE_MESSAGES_RETRIEVED
  );
  if (data?.length === 0) {
    return;
  }
  const history = data!.map((m) =>
    m.sender === SenderType.USER ? "user: " + m.content : "system: " + m.content
  );

  const chatPrompt = new PromptTemplate({
    inputVariables: ["input", "memory"],
    template: `{input}\nConversation to summarize:\n{memory}`,
  });
  const summarizeModel = new ChatOpenAI(summarizeHistoryModelConfig());
  const summary = await chatPrompt.pipe(summarizeModel).invoke(
    {
      input:
        "Summarize the following conversation thread, ensure that all mentioned products are included. Ensure summary is in sequential order",
      memory: history.join("\n"),
    },
    {
      metadata: {
        requestUuid: requestUuid,
        store: store,
        clientId: clientId,
      },
    }
  );

  await insertMessage(
    store,
    clientId,
    "text",
    SenderType.SUMMARY,
    // @ts-ignore
    summary?.content,
    requestUuid
  );
};

export const callOpenai = async (
  input: string,
  store: string,
  clientId: string,
  requestUuid: string,
  source: MessageSource,
  cartContent: string,
  streamWriter?: EventEmitter
) => {
  /* CUSTOMER INFORMATION CONTEXT */
  let customerContext: string[] = [];

  // Check if the customer is new
  const newCustomer = await isNewCustomer(store, clientId);
  customerContext.push(newCustomer.message);

  // If customer is not new, check their cart history and product_viewed history. Add relevant links
  if (newCustomer.isNew === false) {
    const productsViewed = await hasViewedProducts(
      store,
      clientId,
      RECENTLY_VIEWED_PRODUCTS_COUNT
    );

    // Check if the customer has items in their cart
    if (cartContent.length > 0) {
      customerContext.push("User currently has the following items in cart: ", cartContent);
    }

    // Check if the customer has viewed any products
    if (productsViewed.hasViewed === true) {
      customerContext.push(productsViewed.message);
    }
  }
  const llmConfig = LLMConfig[source];

  const { data } = await getMessages(
    store,
    clientId,
    true,
    SUPABASE_MESSAGES_RETRIEVED
  );

  let embeddings, productMappings;
  await Promise.all([
    (async () => {
      embeddings = await runEmbeddingsAndSearch(store, input);
    })(),
    (async () => {
      const { lookUpProducts } = await getProducts(store);
      productMappings = lookUpProducts;
    })(),
  ]);

  const finalChain = await createFinalRunnable(
    customerContext,
    llmConfig,
    data?.length && data?.length > 0
      ? data.map(msg => {
          if (msg.type === 'text') {
            return JSON.parse(msg.content)
          }
          const parsed = JSON.parse(msg.content);
          // Exclude image URL
          return parsed.map((card: { name: string; variants: any; recommendation: string; }) => 
            JSON.stringify({name: card.name, variants: card.variants, recommendation: card.recommendation})
          );
        }).join("\n")
      : "",
    source,
    embeddings!
  );

  const response =
    source === MessageSource.HINTS
      ? await new Runnable(finalChain).run(input, store, clientId, requestUuid)
      : await new Streamable(finalChain, productMappings!, streamWriter!).run(
          input,
          store,
          source,
          clientId,
          requestUuid
        );
  return { show: true, openai: response };
};

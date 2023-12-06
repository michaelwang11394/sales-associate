import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { BufferWindowMemory, ChatMessageHistory } from "langchain/memory";
import { LLMChain } from "langchain/chains";
import { HumanMessage, AIMessage } from "langchain/schema";
import { hasItemsInCart, hasViewedProducts, isNewCustomer } from "./supabase"; // Updated reference to refactored supabase functions
import { getProducts } from "./shopify"; // Updated reference to refactored shopify function
import { LANGCHAIN_MEMORY_BUFFER_SIZE } from "@/constants/constants";

/* CHATS 
// HACK: Replace key after migration to nextjs
*/
const chat = new ChatOpenAI({
  openAIApiKey: "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",
  temperature: 0.7,
  streaming: true,
  modelName: "gpt-3.5-turbo",
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
export const createOpenaiWithHistory = async (clientId, messages = []) => {
  /* CUSTOMER INFORMATION CONTEXT */
  let customerContext = [];

  // Check if the customer is new
  const newCustomer = await isNewCustomer(clientId);
  customerContext.push(newCustomer.message);

  // If customer is not new, check their cart history and product_viewed history. Add relevant links
  if (false && newCustomer.isNew === false) {
    const itemsInCart = await hasItemsInCart(clientId);
    const productsViewed = await hasViewedProducts(clientId);

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

  return await createOpenai(customerContext, history);
};

const createOpenai = async (context, history = []) => {
  // Get Product Catalog
  const catalog = await getProducts();

  // const formattedContext = context
  //   .map((item) => {
  //     if (item.startsWith("http")) {
  //       return `[Link](${item})`;
  //     }
  //     return item;
  //   })
  //   .join("\n");

  const systemTemplate =
    'You are a helpful online sales assistant. Your goal is to help customers in their shopping experience whether it\'s by answering questions, recommending products, or helping them checkout. Be friendly, helpful, and concise in your responses. The below is relevant context for this customer:\n{context}\nGiven that context, here are some suggestions to give the customer a great experience:\nIf the customer has items in their cart but am not on the cart page, encourage them to go to their cart and complete the purchase. \nIf the customer has viewed a product multiple times, encourage them to revisit the product by giving them the product link. \nIf the customer asks for a coupon, give them a coupon link at www.claimcoupon.com\nIf the customer asks you how their search experience was, ask them if they found what they\'re looking for and offer to help refine the search.\nIf the customer is viewing a product, recommend a similar product they may also enjoy.\n The three products this store has are "The Collection Snowboard: Hydrogen", "The Multi-managed Snowboard", and "The Multi-location Snowboard". If you are asked for "recs for beginner boards", recommend these three products: "The Collection Snowboard: Hydrogen", "The Multi-managed Snowboard", and "The Multi-location Snowboard". The respective prices are 600.00USD, 629.95USD, and 729.95USD. When providing a link for the hydrogen model, return the following string `<a href="https://quickstart-c57f5b6f.myshopify.com/products/the-collection-snowboard-hydrogen" style="color: blue; font-weight: bold;">The Collection Snowboard: Hydrogen</a>.` ';

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const formattedSystemMessagePrompt = await systemMessagePrompt.format({
    context: context,
  });

  const humanTemplate = "{message}";

  const chatPrompt = ChatPromptTemplate.fromMessages([
    formattedSystemMessagePrompt,
    humanTemplate,
  ]);

  /* MEMORY 
  // TODO: Because memory is loaded on render, that means, it will also be cleaned out upon navigation to a different page
  */
  const memory = new BufferWindowMemory({
    chatHistory: new ChatMessageHistory(history),
    k: LANGCHAIN_MEMORY_BUFFER_SIZE,
  });

  /* CHAIN */
  const chain = new LLMChain({
    llm: chat,
    prompt: chatPrompt,
    memory: memory,
  });

  return chain;
};

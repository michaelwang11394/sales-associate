import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { BufferWindowMemory } from "langchain/memory";
import { LLMChain } from "langchain/chains";

import {
  fetchTableData,
  hasItemsInCart,
  hasViewedProducts,
  isNewCustomer,
  offerCoupon,
} from "./supabase";

/* CALLING FUNCTION */
export const handleNewCustomerEvent = async (event) => {
  console.log("Loading app...");
  /* CUSTOMER INFORMATION CONTEXT */
  let customerContext = [];

  // Check if the customer is new
  const newCustomer = await isNewCustomer(event.clientId);
  customerContext.push(newCustomer[1]);

  // Get Product Catalog
  //TODO: Use RAG later to get the product catalog
  const catalog = await fetchTableData();

  // If customer is not new, check their cart history and product_viewed history. Add relevent links
  if (newCustomer[0] === false) {
    const itemsInCart = await hasItemsInCart(event.clientId);
    const productsViewed = await hasViewedProducts(event.clientId);
    // Check if the customer has items in their cart
    if (itemsInCart[0] === true) {
      customerContext.push(itemsInCart[1]);
      customerContext.push(itemsInCart[2]);
    }

    // Check if the customer has viewed any products
    if (productsViewed[0] === true) {
      customerContext.push(productsViewed[1]);
      customerContext.push(productsViewed[2]);
    }
  }

  // Check if the customer has viewed their cart multiple times in the past 30 minutes
  const isOfferCoupon = await offerCoupon(event.clientId);

  /* 
  EVENT PARSING 
  Our current setup is imperfect in that we're mapping events to messages from the customer POV that they aren't typing, but we still need to send a message to the AI to get a response. In the ideal scenario, the AI would chat with the customer without any human input. Perhaps, we create another character that oversees the observations between an AI and customer and can coordinate between the two. 

  */
  const parseEvent = (event) => {
    // A user input is a string; whereas, shopify events are all objects
    if (typeof event == "string") {
      return event;
    }
    switch (event.name) {
      // Welcome Intent
      case "page_viewed":
        if (newCustomer[0] === true) {
          return "Hi, this is my first time visiting this store.";
        } else {
          return "Hi, welcome me back to the store and ask for any help I may need.";
        }
      // Cart Intent
      case "cart_viewed":
        if (isOfferCoupon === true) {
          return "I am back at my cart again. I will consider purchasing if you give me a coupon.";
        } else {
          return "Encourage me to checkout.";
        }
      // Product Intent
      case "product_viewed":
        const product = event.detail.productVariant.product.title;
        return `I am looking at ${product}. Suggest for me another product in your catalog for me to look at. `;
      // Search Intent
      case "search_submitted":
        const searchQuery = event.detail.query;
        q;
        return `I am searching for ${searchQuery}. Ask me if I found what I was looking for.`;
      default:
        return "Hello.";
    }
  };

  /* PROMPTS */

  const systemTemplate =
    "You are a helpful online sales assistant. Your goal is to help customers in their shopping experience whether it's by answering questions, recommending products, or helping them checkout. Be friendly, helpful, and concise in your responses. The below is relevent context for this customer:\n{context}\nGiven that context, here are some suggestions to give the customer a great experience:\nIf the customer has items in their cart, encourage them to go to their cart and complete the purchase. You are provided the link for the cart. \nIf the customer has viewed a product multiple times, encourage them to revisit the product by giving them the product link.\nIf the customer asks for a coupon, give them a coupon link at www.claimcoupon.com\nIf the customer asks you how their search experience was, ask them if they found what they're looking for and offer to help refine search.\nIf the customer is viewing a product, recommend a similar product they may also enjoy. Here's the whole product catalog:\n{catalog}";

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const formattedSystemMessagePrompt = await systemMessagePrompt.format({
    context: customerContext,
    catalog: catalog,
  });

  const humanTemplate = "{message}";

  const chatPrompt = ChatPromptTemplate.fromMessages([
    formattedSystemMessagePrompt,
    humanTemplate,
  ]);

  /* CHATS 
// HACK: Replace key after migration to nextjs
*/
  const chat = new ChatOpenAI({
    openAIApiKey: "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",
    temperature: 0.7,
    streaming: true,
  });

  /* MEMORY 
  // TODO: Because memory is loaded on render, that means, it will also be cleaned out upon navigation to a different page
  */
  const memory = new BufferWindowMemory({ k: 3 });

  /* CHAIN */
  const chain = new LLMChain({
    llm: chat,
    prompt: chatPrompt,
    memory: memory,
  });

  const message = parseEvent(event);

  const res = await chain.call({ message: message });
  return res;
};

import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts";
import { BufferWindowMemory } from "langchain/memory";
import { LLMChain } from "langchain/chains";

import { hasItemsInCart, hasViewedProducts, isNewCustomer } from "./supabase";

/* CALLING FUNCTION */
export const handleNewCustomerEvent = async (event) => {
  /* CUSTOMER INFORMATION CONTEXT */
  let customerContext = [];

  // Check if the customer is new
  const newCustomer = await isNewCustomer(event.clientId);
  customerContext.push(newCustomer[1]);

  // If customer is not new, check their cart history and product_viewed history
  if (newCustomer[0] === false) {
    // Check if the customer has items in their cart
    const itemsInCart = await hasItemsInCart(event.clientId);
    const productsViewed = await hasViewedProducts(event.clientId);

    if (itemsInCart[0] === true) {
      customerContext.push(itemsInCart[1]);
    }

    // Check if the customer has viewed any products
    if (productsViewed[0] === true) {
      customerContext.push(productsViewed[1]);
    }
  }

  /* PROMPTS */

  const systemTemplate =
    "You are a helpful online sales assistant. Your goal is to help customers in their shopping experience whether it's by answering questions, recommending products, or helping them checkout. Be friendly and helpful. The below is relevent context for this customer:\n{context}\nGiven that context, here are some suggestions to give the customer a great experience:\nIf the customer has items in their cart, encourage them to go to their cart and complete the purchase.\nIf the customer has viewed a product multiple times, encourage them to revisit the product";

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const formattedSystemMessagePrompt = await systemMessagePrompt.format({
    context: customerContext,
  });

  const humanTemplate = "{message}";
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  console.log(formattedSystemMessagePrompt);

  const chatPrompt = ChatPromptTemplate.fromMessages([
    formattedSystemMessagePrompt,
    humanMessagePrompt,
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
//TODO: Look into entity memory. 
*/

  const memory = new BufferWindowMemory({ k: 3 });

  /* CHAIN */
  const chain = new LLMChain({
    llm: chat,
    prompt: chatPrompt,
    memory: memory,
  });

  /* 
  EVENT PARSING 

*/
  const parseEvent = async (event) => {
    switch (event) {
      //
      case "page_viewed":
        return "Hi!";
    }
  };

  const message = parseEvent(event);
  const res = await chain.call({ message: message });
  return res;
};

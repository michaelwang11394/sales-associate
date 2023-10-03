import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts";
import { BufferWindowMemory } from "langchain/memory";
import { LLMChain } from "langchain/chains";

import { isNewCustomer } from "./supabase";

/* CALLING FUNCTION */
export const handleNewCustomerEvent = async (event) => {
  /* PROMPTS */

  const systemTemplate =
    "You are a helpful online sales assistant. Your goal is to help customers in their shopping experience whether it's by answering questions, recommending products, or helping them checkout. Be friendly and helpful.";

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);

  const humanTemplate = "{message}";
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromMessages([
    systemMessagePrompt,
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
  For now, we convert the message to a human message. However, it's worth exploring whether we should just add it as a System message directly.
*/
  const parseEvent = async (event) => {
    switch (event) {
      //
      case "page_viewed":
        const newCustomer = await isNewCustomer(event.clientId);
        if (newCustomer) {
          return "Hi! This is my first time at this store.";
        } else {
          // TODO: Check for their product history.
          return "Hi! It's good to see you again.";
        }
      case "product_viewed":
    }
  };

  const message = parseEvent(event);
  const res = await chain.call({ message: message });
  return res;
};

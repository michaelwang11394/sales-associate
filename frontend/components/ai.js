import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts";
import { BufferWindowMemory } from "langchain/memory";
import { LLMChain } from "langchain/chains";

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

/* CALLING FUNCTION */
export const handleNewCustomerEvent = async (event) => {
  // TODO: Think about how we modify event.

  const res = await chain.call({ message: "I need to make a purchase" });
  console.log(res);
};

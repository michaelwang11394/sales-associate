import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "langchain/schema/runnable";
import { zodToJsonSchema } from "zod-to-json-schema";
import { MessageSource } from "../../../types";
import {
  chatResponseSchema,
  gpt35ModelConfig,
  hintsSchema,
  salesModelConfig
} from "../llmConfig";
import type { LLMConfigType } from "../types";

export const createFinalRunnable = async (
  context: string[],
  llmConfig: LLMConfigType,
  chat_history_summary: string,
  messageSource: MessageSource,
  embeddings: string[]
) => {
  const systemTemplate = llmConfig.prompt;

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const formattedSystemMessagePrompt = await systemMessagePrompt.format({
    context: context.join("\r\n"),
  });

  const chatPrompt = ChatPromptTemplate.fromMessages([
    formattedSystemMessagePrompt,
    ["system", "{history}"],
    ["system", "{products}"],
    [messageSource === MessageSource.CHAT ? "user" : "system", "{input}"],
  ]);

  /* If using replicate, bind will NOT work. So find alternate way for structured output
    Do not create structured output with the embed greeting
   */
  const salesModel = new ChatOpenAI(messageSource === MessageSource.EMBED_HOME ? gpt35ModelConfig() : salesModelConfig())
  const lastRunnable = await getLastRunnable(
    messageSource,
    chatPrompt,
    salesModel
  );

  const salesChain = RunnableSequence.from([
    RunnablePassthrough.assign({
      products: (_) => "Here are relevant products\n" + embeddings.join("\r\n"),
    }),
    RunnablePassthrough.assign({
      history: (_) => chat_history_summary,
    }),
    lastRunnable,
  ]);

  return salesChain;
};

const getLastRunnable = async (
  messageSource: MessageSource,
  chatPrompt: any,
  salesModel: any
) => {
  switch (messageSource) {
    case MessageSource.CHAT:
      return chatPrompt.pipe(
        salesModel.bind({
          functions: [
            {
              name: "output_formatter",
              description: "Always use to properly format output",
              parameters: zodToJsonSchema(chatResponseSchema),
            },
          ],
          function_call: { name: "output_formatter" },
        })
      );
    case MessageSource.HINTS:
      return chatPrompt.pipe(
        salesModel.bind({
          functions: [
            {
              name: "output_formatter",
              description: "Always use to properly format output",
              parameters: zodToJsonSchema(hintsSchema),
            },
          ],
          function_call: { name: "output_formatter" },
        })
      );
    default:
      return chatPrompt.pipe(salesModel);
  }
};

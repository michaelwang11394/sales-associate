import type { BufferMemory } from "langchain/memory";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "langchain/schema/runnable";
import { zodToJsonSchema } from "zod-to-json-schema";
import { MessageSource } from "../../../types";
import { salesModel, zodSchema } from "../llmConfig";
import type { LLMConfigType } from "../types";

export const createFinalRunnable = async (
  context: string[],
  llmConfig: LLMConfigType,
  memory: BufferMemory,
  messageSource: MessageSource,
  previous_chain?: RunnableSequence // If chaining, what is the previous chain
) => {
  const systemTemplate = llmConfig.prompt;

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const formattedSystemMessagePrompt = await systemMessagePrompt.format({
    context: context,
  });

  const chatPrompt = ChatPromptTemplate.fromMessages([
    formattedSystemMessagePrompt,
    new MessagesPlaceholder("history"),
    ["system", "{products}"],
    [messageSource === MessageSource.CHAT ? "user" : "system", "{input}"],
  ]);

  /* If using replicate, bind will NOT work. So find alternate way for structured output
    Do not create structured output with the embed greeting
   */
  const lastRunnable =
    messageSource === MessageSource.CHAT
      ? chatPrompt
          .pipe(
            salesModel.bind({
              functions: [
                {
                  name: "output_formatter",
                  description:
                    "Should always be used to properly format output",
                  parameters: zodToJsonSchema(zodSchema),
                },
              ],
              function_call: { name: "output_formatter" },
            })
          )
          .pipe(new JsonOutputFunctionsParser())
      : chatPrompt.pipe(salesModel);

  const salesChain = RunnableSequence.from([
    RunnablePassthrough.assign({
      memory: () => memory.loadMemoryVariables({}),
      products: (input) => input.products ?? "No relevant products",
    }),
    RunnablePassthrough.assign({
      history: (previousOutput) => {
        // @ts-ignore
        const mem = previousOutput.memory.history;
        return mem;
      },
    }),
    lastRunnable,
  ]);

  return previous_chain ? previous_chain.pipe(salesChain) : salesChain;
};

import type { BufferMemory } from "langchain/memory";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { zodToJsonSchema } from "zod-to-json-schema";
import { chatSalesModel, zodSchema } from "../llmConfig";
import type { LLMConfigType } from "../types";

export const createFinalRunnable = async (
  context: string[],
  llmConfig: LLMConfigType,
  memory: BufferMemory,
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
    ["user", "{input}"],
  ]);

  // Binding "function_call" below makes the model always call the specified function.
  // If you want to allow the model to call functions selectively, omit it.
  const functionCallingModel = chatSalesModel.bind({
    functions: [
      {
        name: "output_formatter",
        description: "Should always be used to properly format output",
        parameters: zodToJsonSchema(zodSchema),
      },
    ],
    function_call: { name: "output_formatter" },
  });

  const outputParser = new JsonOutputFunctionsParser();

  const salesChain = RunnableSequence.from([
    {
      input: (initialInput) => {
        return initialInput.input;
      },
      memory: () => memory.loadMemoryVariables({}),
    },
    {
      input: (previousOutput) => {
        return previousOutput.input;
      },
      history: (previousOutput) => {
        const mem = previousOutput.memory.history;
        return mem;
      },
    },
    chatPrompt.pipe(functionCallingModel).pipe(outputParser),
  ]);

  return previous_chain ? previous_chain.pipe(salesChain) : salesChain;
};

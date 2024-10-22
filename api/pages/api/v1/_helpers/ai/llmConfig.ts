import { z } from "zod";

import { OPENAI_KEY, REPLICATE_KEY } from "../../constants";
import { HalluctinationCheckSeverity, MessageSource } from "../../types";
import {
  GPT_3_5_TURBO_16K_MODEL,
  GPT_4_TURBO_16K_MODEL,
  Platforms,
} from "./constants";
import { SupabaseCallbackHandler } from "./logging/SupabaseCallbackHandler";
import type { LLMConfigType } from "./types";

const createChatOpenAIConfig = (
  apiKey: string,
  temperature: number,
  modelName: string,
  callbacks: any[] = []
) => {
  return {
    apiKey,
    temperature,
    modelName,
    callbacks,
  };
};

// Assuming ReplicateInput is defined somewhere, extend it or define it if it's not available
interface ReplicateInput {
  apiKey: string;
  model: `${string}/${string}:${string}`; // This line enforces the template literal type
}

// Adjust your createReplicateConfig function to explicitly return the ReplicateInput type
const createReplicateConfig = (apiKey: string, model: `${string}/${string}:${string}`): ReplicateInput => {
  return {
    apiKey,
    model,
  };
};

export const LLMConfig: Record<MessageSource, LLMConfigType> = {
  [MessageSource.CHAT]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer the user's question.\nHere is user-specific context if any:\n{context}.\nIf the question is not related to the store or its products, apologize and ask if you can help them another way. Do not wrap output in brackets or double quotes.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
  [MessageSource.CHAT_GREETING]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely greet the user.\nHere is user-specific context if any:\n{context}.\nKeep all responses to less than 100 characters. Do not wrap output in brackets or double quotes.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
  [MessageSource.EMBED_HOME]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely greet the user.\nHere is user-specific context if any:\n{context}.\nKeep all responses to less than 100 characters. Do not wrap output in brackets or double quotes.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
  [MessageSource.EMBED]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely greet the user.\nHere is user-specific context if any:\n{context}.\nKeep all responses to less than 100 characters. Do not wrap output in brackets or double quotes.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
  [MessageSource.HINTS]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer the user's request.\nHere is user-specific context if any:{context}.\nKeep all responses to less than 100 characters. Do not wrap output in brackets or double quotes.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
};

export const chatResponseSchema = z.object({
  plainText: z
    .string()
    .describe(
      "The response directly displayed to user. Keep to less than 250 characters"
    ),
  products: z
    .array(
      z.object({
        product_id: z
          .string()
          .describe("The product id that is referred to in recommendation. This id is a number with around 14 digits"),
        recommendation: z
          .string()
          .describe(
            "Should be around 500 characters, use bullet points and paragraphs for readability. Detailed breakdown why this product is relevant and a great fit for user. Format is one line summary, followed by a paragraph for reasons why this is relevant."
          ),
      })
    )
    .describe("A list of products referred to in the response"),
});

export const hintsSchema = z.object({
  first_hint: z
    .string()
    .describe(
      "The first and most relevant query user can input to continue conversation"
    ),
  second_hint: z
    .string()
    .describe(
      "The second relevant query user can input to continue conversation. Ensure it is a different type of query from first_hint"
    ),
  third_hint: z
    .string()
    .describe(
      "The third relevant query user can input to continue conversation. Ensure this query is different than first_hint or second_hint"
    ),
});

export const summarizeHistoryModelConfig = () => {
  return createChatOpenAIConfig(
    OPENAI_KEY,
    1.0,
    GPT_4_TURBO_16K_MODEL,
    [
      new SupabaseCallbackHandler(Platforms.Openai, GPT_4_TURBO_16K_MODEL),
    ],
  );
};

export const salesModelConfig = () => {
  return createChatOpenAIConfig(
    OPENAI_KEY,
    0.7,
    GPT_4_TURBO_16K_MODEL,
    [
      new SupabaseCallbackHandler(Platforms.Openai, GPT_4_TURBO_16K_MODEL),
    ],
  );
};

export const gpt35ModelConfig = () => {
  return createChatOpenAIConfig(
    OPENAI_KEY,
    1.0,
    GPT_3_5_TURBO_16K_MODEL,
    [
      new SupabaseCallbackHandler(Platforms.Openai, GPT_3_5_TURBO_16K_MODEL),
    ],
  );
};

export const replicateMistralModelConfig = () => {
  return createReplicateConfig(
    REPLICATE_KEY,
    "mistralai/mixtral-8x7b-instruct-v0.1:7b3212fbaf88310cfef07a061ce94224e82efc8403c26fc67e8f6c065de51f21",
  );
};

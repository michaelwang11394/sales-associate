import { ChatOpenAI } from "langchain/chat_models/openai";
import { Replicate } from "langchain/llms/replicate";
import { z } from "zod";

import { OPENAI_KEY, REPLICATE_KEY } from "../../constants";
import { HalluctinationCheckSeverity, MessageSource } from "../../types";
import {
  GPT_3_5_TURBO_16K_MODEL,
  GPT_3_5_TURBO_MODEL,
  Platforms,
} from "./constants";
import { SupabaseCallbackHandler } from "./logging/SupabaseCallbackHandler";
import type { LLMConfigType } from "./types";

export const LLMConfig: Record<MessageSource, LLMConfigType> = {
  [MessageSource.CHAT]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's question.\nHere is user-specific context if any:{context}.\nIf the question is not related to the store or its products, apologize and ask if you can help them another way. Keep responses to less than 150 characters for the plainText field and readable`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
  [MessageSource.CHAT_GREETING]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's question.\nHere is user-specific context if any:{context}.\nIf the question is not related to the store or its products, apologize and ask if you can help them another way. Keep all responses to less than 100 characters.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
  [MessageSource.EMBED]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's request.\nHere is user-specific context if any:{context}.\nKeep all responses to less than 100 characters.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
};

export const zodSchema = z.object({
  plainText: z.string().describe("The response directly displayed to user"),
  products: z
    .array(
      z.object({
        product_handle: z.string().describe("The product handle of product"),
      })
    )
    .describe("A list of products mentioned in the response, if any"),
});

export const summarizeHistoryModel = new ChatOpenAI({
  openAIApiKey: OPENAI_KEY,
  temperature: 1.0,
  modelName: GPT_3_5_TURBO_MODEL,
});

export const salesModel = new ChatOpenAI({
  openAIApiKey: OPENAI_KEY,
  temperature: 0.7,
  modelName: GPT_3_5_TURBO_16K_MODEL,
  callbacks: [
    new SupabaseCallbackHandler(Platforms.Openai, GPT_3_5_TURBO_16K_MODEL),
  ],
});

export const simpleSearchModel = new ChatOpenAI({
  openAIApiKey: OPENAI_KEY,
  temperature: 1.0,
  modelName: GPT_3_5_TURBO_16K_MODEL,
});

export const replicateMistralModel = new Replicate({
  apiKey: REPLICATE_KEY,
  model:
    "mistralai/mixtral-8x7b-instruct-v0.1:7b3212fbaf88310cfef07a061ce94224e82efc8403c26fc67e8f6c065de51f21",
});

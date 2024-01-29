import { z } from "zod";

import { OPENAI_KEY, REPLICATE_KEY } from "../../constants";
import { HalluctinationCheckSeverity, MessageSource } from "../../types";
import {
  GPT_3_5_TURBO_16K_MODEL,
  GPT_3_5_TURBO_MODEL,
  GPT_4_TURBO_16K_MODEL,
  Platforms,
} from "./constants";
import { SupabaseCallbackHandler } from "./logging/SupabaseCallbackHandler";
import type { LLMConfigType } from "./types";

const createChatOpenAIConfig = (
  apiKey: string,
  temperature: number,
  modelName: string,
  callbacks = []
) => {
  return {
    apiKey,
    temperature,
    modelName,
    callbacks,
  };
};

const createReplicateConfig = (apiKey: string, modelName: string) => {
  return {
    apiKey,
    modelName,
  };
};

export const createModelConfig = (modelType: string, config: any) => {
  switch (modelType) {
    case "chatOpenAI":
      return createChatOpenAIConfig(
        config.apiKey,
        config.temperature,
        config.modelName,
        config.callbacks
      );
    case "replicate":
      return createReplicateConfig(config.apiKey, config.modelName);
    // Add more model types if needed

    default:
      throw new Error(`Unsupported model type: ${modelType}`);
  }
};

export const LLMConfig: Record<MessageSource, LLMConfigType> = {
  [MessageSource.CHAT]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's question.\nHere is user-specific context if any:{context}.\nIf the question is not related to the store or its products, apologize and ask if you can help them another way.`,
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
  [MessageSource.HINTS]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's request.\nHere is user-specific context if any:{context}.\nKeep all responses to less than 100 characters.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
};

export const chatResponseSchema = z.object({
  plainText: z
    .string()
    .describe(
      "The response directly displayed to user. Keep to less than 200 characters"
    ),
  products: z
    .array(
      z.object({
        recommendation: z
          .string()
          .describe(
            "Should be around 500 characters, use bullet points and paragraphs for readability. Detailed breakdown why this product is relevant and a great fit for user. Format is one line summary, followed by a paragraph for reasons why this is relevant."
          ),
        name: z.string().describe("The name of the product"),
        product_handle: z.string().describe("The product handle"),
        image: z
          .string()
          .includes("cdn.shopify.com", {
            message: "Must include cdn.shopify.com",
          })
          .describe(
            "The image url of the product. Must include cdn.shopify.com"
          ),
        variants: z
          .array(
            z
              .object({
                id: z.string().describe("The id of this variant"),
                title: z.string().describe("The title of this variant"),
                price: z.number().describe("The price of the product"),
                featured_image: z
                  .string()
                  .url()
                  .describe("The featured image of the product variant"),
              })
              .describe("A variant of product that has a specific price")
          )
          .describe("Array of variants of product if not empty")
          .optional(),
      })
    )
    .describe("A list of products referred to in the response"),
});

export const hintsSchema = z.object({
  first_hint: z
    .string()
    .describe(
      "The first and most relevant query user can input to continue message"
    ),
  second_hint: z
    .string()
    .describe(
      "The second relevant query user can input to continue message. Ensure it is a different type of message from first_hint"
    ),
  third_hint: z
    .string()
    .describe(
      "The third relevant query user can input. Ensure different than first_hint or second_hint"
    ),
});

export const summarizeHistoryModelConfig = () => {
  return createModelConfig("chatOpenAI", {
    apiKey: OPENAI_KEY,
    temperature: 1.0,
    modelName: GPT_3_5_TURBO_MODEL,
  });
};

export const salesModelConfig = () => {
  return createModelConfig("chatOpenAI", {
    apiKey: OPENAI_KEY,
    temperature: 0.7,
    modelName: GPT_4_TURBO_16K_MODEL,
    callbacks: [
      new SupabaseCallbackHandler(Platforms.Openai, GPT_4_TURBO_16K_MODEL),
    ],
  });
};

export const simpleSearchModelConfig = () => {
  return createModelConfig("chatOpenAI", {
    apiKey: OPENAI_KEY,
    temperature: 1.0,
    modelName: GPT_3_5_TURBO_16K_MODEL,
  });
};

export const replicateMistralModelConfig = () => {
  return createModelConfig("replicate", {
    apiKey: REPLICATE_KEY,
    modelName:
      "mistralai/mixtral-8x7b-instruct-v0.1:7b3212fbaf88310cfef07a061ce94224e82efc8403c26fc67e8f6c065de51f21",
  });
};

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
  plainText: z
    .string()
    .describe(
      "The plain text response to the user that can refer to the products field for any images or richer content. This field will be presented as just text, so keep it very readable"
    ),
  products: z
    .array(
      z.object({
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
    .describe(
      "A list of products that exist in the catalog and are referenced in plainText field. All products must be unique and product_handle must be a real product_handle mentioned in the system prompt"
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
    modelName: GPT_3_5_TURBO_16K_MODEL,
    callbacks: [
      new SupabaseCallbackHandler(Platforms.Openai, GPT_3_5_TURBO_16K_MODEL),
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

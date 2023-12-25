import { ChatOpenAI } from "langchain/chat_models/openai";
import { z } from "zod";
import { OPENAI_KEY } from "../../constants";
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
  [MessageSource.EMBED]: {
    prompt: `You are a sales assistant for an online store. Your goal is to concisely answer to the user's request.\nHere is user-specific context if any:{context}\n. Keep all responses to less than 100 characters.`,
    include_embeddings: true,
    validate_hallucination: HalluctinationCheckSeverity.FILTER,
  },
};

export const zodSchema = z.object({
  plainText: z.string().describe("The response directly displayed to user"),
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
    .describe("A list of products mentioned in the response, if any"),
});

export const chatSalesModel = new ChatOpenAI({
  openAIApiKey: OPENAI_KEY,
  temperature: 0.7,
  modelName: GPT_3_5_TURBO_MODEL,
  callbacks: [
    new SupabaseCallbackHandler(Platforms.Openai, GPT_3_5_TURBO_MODEL),
  ],
});

export const chatProductModel = new ChatOpenAI({
  openAIApiKey: OPENAI_KEY,
  temperature: 1.0,
  modelName: GPT_3_5_TURBO_16K_MODEL,
  callbacks: [
    new SupabaseCallbackHandler(Platforms.Openai, GPT_3_5_TURBO_16K_MODEL),
  ],
});

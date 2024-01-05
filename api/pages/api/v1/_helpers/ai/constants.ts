export const MESSAGE_SUMMARY_FLUSH_THRESHOLD = 100; // Recent messages are stored in raw condition until this threshold is hit, at which point it will be flushed and summarized
export const GPT_3_5_TURBO_MODEL = "gpt-3.5-turbo";
export const GPT_3_5_TURBO_16K_MODEL = "gpt-3.5-turbo-16k";
export const GPT_4_TURBO_16K_MODEL = "gpt-4-1106-preview";
export const MISTRAL_7B_V0_1_MODEL = "mistral-7b-v0.1-instruct";

export enum Platforms {
  Openai = "openai",
  Replicate = "replicate",
}
export const PLATFORM_UNIT_TYPES = {
  [Platforms.Openai]: "tokens",
  [Platforms.Replicate]: "time (s)",
};

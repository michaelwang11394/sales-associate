export const MESSAGE_SUMMARY_FLUSH_THRESHOLD = 100; // Recent messages are stored in raw condition until this threshold is hit, at which point it will be flushed and summarized
export const GPT_3_5_TURBO_MODEL = "gpt-3.5-turbo";
export const GPT_3_5_TURBO_16K_MODEL = "gpt-3.5-turbo-16k";
export const GPT_4_TURBO_16K_MODEL = "gpt-4-turbo-preview";
export const EMBEDDING_SMALL_MODEL = "text-embedding-3-small";

export enum Platforms {
  Openai = "openai",
}
export const PLATFORM_UNIT_TYPES = {
  [Platforms.Openai]: "tokens",
};

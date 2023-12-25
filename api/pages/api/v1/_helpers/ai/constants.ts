export const GPT_3_5_TURBO_MODEL = "gpt-3.5-turbo";
export const GPT_3_5_TURBO_16K_MODEL = "gpt-3.5-turbo-16k";

export enum Platforms {
  Openai = "openai",
}
export const PLATFORM_UNIT_TYPES = {
  [Platforms.Openai]: "tokens",
};

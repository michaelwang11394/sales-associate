import type { HalluctinationCheckSeverity } from "../../types";

export type LLMConfigType = {
  prompt: string;
  include_embeddings: boolean;
  validate_hallucination: HalluctinationCheckSeverity;
};

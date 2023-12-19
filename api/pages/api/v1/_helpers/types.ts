import type { HalluctinationCheckSeverity } from "../types";

export interface LLMConfigType {
  prompt: string;
  include_embeddings: boolean;
  validate_hallucination: HalluctinationCheckSeverity;
}

import { BaseCallbackHandler } from "langchain/callbacks";
import type { Serialized } from "langchain/load/serializable";
import type { LLMResult } from "langchain/schema";
import { logModelRun } from "../../supabase_queries";
import type { Platforms } from "../constants";
import { PLATFORM_UNIT_TYPES } from "../constants";

export class SupabaseCallbackHandler extends BaseCallbackHandler {
  name = "SupabaseCallbackHandler";
  input: string;
  startTimestamp?: number;

  constructor(private platform: Platforms, private model: string) {
    super();
    this.input = "";
    this.startTimestamp = undefined;
  }

  async handleLLMStart(
    llm: Serialized,
    prompts: string[],
    runId: string,
    parentRunId?: string | undefined,
    extraParams?: Record<string, unknown> | undefined,
    tags?: string[] | undefined,
    metadata?: Record<string, unknown> | undefined,
    name?: string | undefined
  ) {
    this.input = prompts.join("");
    this.startTimestamp = Date.now();
  }

  async handleLLMEnd(
    output: LLMResult,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined
  ) {
    console.log("output", JSON.stringify(output.generations[0][0]));
    console.log("runId", runId);
    await logModelRun({
      success: true,
      input: this.input,
      platform: this.platform,
      model: this.model,
      run_id: runId,
      timestamp: this.startTimestamp,
      input_cost: output?.llmOutput?.tokenUsage?.promptTokens,
      output_cost: output?.llmOutput?.tokenUsage?.completionTokens,
      rate_type: PLATFORM_UNIT_TYPES[this.platform],
      duration: Date.now() - this.startTimestamp!,
      output: JSON.stringify(output.generations[0][0].message),
    });
    this.input = "";
    this.startTimestamp = undefined;
  }

  async handleLLMError(
    err: any,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined
  ) {
    await logModelRun({
      success: false,
      input: this.input,
      platform: this.platform,
      model: this.model,
      run_id: runId,
      timestamp: this.startTimestamp,
      output: err,
    });
    this.input = "";
    this.startTimestamp = undefined;
  }
}
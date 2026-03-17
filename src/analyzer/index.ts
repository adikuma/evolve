import type { ParsedData } from "../parser/types.js";
import type { StoredPattern } from "../db/types.js";
import { buildAnalysisPrompt } from "./prompt.js";
import { zodToJsonSchema } from "./zod-to-json.js";
import { AnalysisResultSchema } from "./schemas.js";
import type { AnalysisResult } from "./schemas.js";

// message type from the agent sdk async iterable
export interface AgentMessage {
  type: string;
  result?: string;
  structured_output?: unknown;
  [key: string]: unknown;
}

export interface AnalyzerDeps {
  agentQuery: (args: {
    prompt: string;
    options: {
      model: string;
      maxBudgetUsd: number;
      permissionMode: string;
      allowDangerouslySkipPermissions: boolean;
      allowedTools: string[];
      outputFormat?: { type: "json_schema"; schema: Record<string, unknown> };
    };
  }) => AsyncIterable<AgentMessage>;
  model: string;
  maxBudgetUsd: number;
}

// precompute the json schema for structured output
const analysisJsonSchema = zodToJsonSchema(AnalysisResultSchema);

export async function analyze(args: {
  data: ParsedData;
  deps: AnalyzerDeps;
  existingPatterns?: StoredPattern[];
}): Promise<AnalysisResult> {
  const { data, deps, existingPatterns = [] } = args;

  // build the prompt from parsed data, including existing patterns for incremental analysis
  const prompt = buildAnalysisPrompt(data, existingPatterns);

  // call the agent sdk with structured output format
  const messages = deps.agentQuery({
    prompt,
    options: {
      model: deps.model,
      maxBudgetUsd: deps.maxBudgetUsd,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      allowedTools: [],
      outputFormat: { type: "json_schema", schema: analysisJsonSchema },
    },
  });

  // iterate async iterable, find result message
  let resultJson: string | undefined;
  let structuredOutput: unknown;
  for await (const msg of messages) {
    if (msg.type === "result") {
      structuredOutput = msg.structured_output;
      if (typeof msg.result === "string") {
        resultJson = msg.result;
      }
      break;
    }
  }

  // prefer structured_output when available, fall back to parsing result text
  if (structuredOutput != null) {
    return AnalysisResultSchema.parse(structuredOutput);
  }

  if (!resultJson) {
    throw new Error("no result message received from agent");
  }

  // strip markdown code fences if the llm wrapped its response in them
  // this fallback is needed when the sdk doesnt return structured_output
  let cleaned = resultJson.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  // parse and validate
  const parsed = JSON.parse(cleaned);
  return AnalysisResultSchema.parse(parsed);
}

// re-exports
export { buildAnalysisPrompt } from "./prompt.js";
export {
  PatternSchema,
  AnalysisResultSchema,
  PatternCategorySchema,
  SolutionTypeSchema,
  EvidenceSchema,
} from "./schemas.js";
export type { Pattern, AnalysisResult } from "./schemas.js";
export { zodToJsonSchema } from "./zod-to-json.js";

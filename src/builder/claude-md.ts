import type { Pattern } from "../analyzer/schemas.js";
import type { Artifact } from "../deployer/index.js";
import type { AgentMessage } from "../analyzer/index.js";
import { fillTemplate } from "../prompts/loader.js";
import claudeMdPromptMd from "../prompts/builders/claude-md.md";

export interface ClaudeMdBuilderDeps {
  agentQuery: (args: {
    prompt: string;
    options: {
      model: string;
      maxBudgetUsd: number;
      permissionMode: string;
      allowDangerouslySkipPermissions: boolean;
      allowedTools: string[];
    };
  }) => AsyncIterable<AgentMessage>;
  model: string;
  maxBudgetUsd: number;
}

// builds a claude.md section with open/close evolve markers
export async function buildClaudeMdEntry(args: {
  pattern: Pattern;
  deps: ClaudeMdBuilderDeps;
}): Promise<Artifact> {
  const { pattern, deps } = args;

  const prompt = fillTemplate(claudeMdPromptMd, {
    id: pattern.id,
    description: pattern.description,
    category: pattern.category,
    solution_summary: pattern.solution_summary,
  });

  const messages = deps.agentQuery({
    prompt,
    options: {
      model: deps.model,
      maxBudgetUsd: deps.maxBudgetUsd,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      allowedTools: [],
    },
  });

  let result = "";
  for await (const msg of messages) {
    if (msg.type === "result" && typeof msg.result === "string") {
      result = msg.result;
      break;
    }
  }

  if (!result) {
    throw new Error(`no result from agent for claude_md_entry ${pattern.id}`);
  }

  // strip markdown code fences if the llm wrapped its response
  let content = result.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```(?:markdown|md)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  return {
    type: "claude_md_entry",
    name: pattern.id,
    content,
  };
}

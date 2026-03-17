import type { Pattern } from "../analyzer/schemas.js";
import type { Artifact } from "../deployer/index.js";
import type { AgentMessage } from "../analyzer/index.js";
import { fillTemplate } from "../prompts/loader.js";
import skillPromptMd from "../prompts/builders/skill.md";

export interface SkillBuilderDeps {
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

// builds a skill.md file from an analyzed pattern
export async function buildSkill(args: {
  pattern: Pattern;
  deps: SkillBuilderDeps;
}): Promise<Artifact> {
  const { pattern, deps } = args;

  const prompt = fillTemplate(skillPromptMd, {
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
    throw new Error(`no result from agent for skill ${pattern.id}`);
  }

  // strip markdown code fences if the llm wrapped its response
  let content = result.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```(?:markdown|md)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  return {
    type: "skill",
    name: pattern.id,
    content,
  };
}

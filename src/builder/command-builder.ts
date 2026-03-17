import type { Pattern } from "../analyzer/schemas.js";
import type { Artifact } from "../deployer/index.js";
import type { BuilderDeps } from "./index.js";
import { fillTemplate } from "../prompts/loader.js";
import commandPromptMd from "../prompts/builders/command.md";

// builds a commands/{name}.md file with a reusable prompt template
export async function buildSlashCommand(args: {
  pattern: Pattern;
  deps: BuilderDeps;
}): Promise<Artifact> {
  const { pattern, deps } = args;

  const prompt = fillTemplate(commandPromptMd, {
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
    throw new Error(`no result from agent for slash_command ${pattern.id}`);
  }

  // strip markdown code fences if the llm wrapped its response
  let content = result.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```(?:markdown|md)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  return {
    type: "slash_command",
    name: pattern.id,
    content,
  };
}

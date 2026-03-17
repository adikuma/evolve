import type { Pattern } from "../analyzer/schemas.js";
import type { Artifact } from "../deployer/index.js";
import type { AgentMessage } from "../analyzer/index.js";
import { buildSkill } from "./skill-builder.js";
import { buildClaudeMdEntry } from "./claude-md.js";
import { buildConditionalRule } from "./rule-builder.js";
import { buildSlashCommand } from "./command-builder.js";
import { buildSubagent } from "./agent-builder.js";

export { buildSkill } from "./skill-builder.js";
export { buildClaudeMdEntry } from "./claude-md.js";
export { buildConditionalRule } from "./rule-builder.js";
export { buildSlashCommand } from "./command-builder.js";
export { buildSubagent } from "./agent-builder.js";
export {
  validateSkill,
  validateClaudeMdEntry,
  validateConditionalRule,
  validateSlashCommand,
  validateSubagent,
} from "./validator.js";

export interface BuilderDeps {
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

// builds all artifacts for given patterns in parallel
export async function buildAll(args: {
  patterns: Pattern[];
  deps: BuilderDeps;
}): Promise<Artifact[]> {
  const { patterns, deps } = args;

  const promises = patterns.map((pattern) => {
    switch (pattern.solution_type) {
      case "skill":
        return buildSkill({ pattern, deps });
      case "claude_md_entry":
        return buildClaudeMdEntry({ pattern, deps });
      case "conditional_rule":
        return buildConditionalRule({ pattern, deps });
      case "slash_command":
        return buildSlashCommand({ pattern, deps });
      case "subagent":
        return buildSubagent({ pattern, deps });
    }
  });

  return Promise.all(promises);
}

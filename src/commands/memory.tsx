import React from "react";
import { render } from "ink";
import { resolvePaths } from "../utils/paths.js";
import { loadConfig } from "../utils/config.js";
import { createPatternDB } from "../db/patterns.js";
import { toAnalyzerPattern } from "../db/types.js";
import { buildAll } from "../builder/index.js";
import { validateSkill, validateClaudeMdEntry, validateConditionalRule, validateSlashCommand, validateSubagent } from "../builder/index.js";
import { deploy } from "../deployer/index.js";
import type { Artifact } from "../deployer/index.js";
import type { AgentMessage } from "../analyzer/index.js";
import { Memory } from "../ui/components/memory.js";

function createAgentQuery(): (args: {
  prompt: string;
  options: Record<string, unknown>;
}) => AsyncIterable<AgentMessage> {
  let queryFn: ((args: { prompt: string; options: Record<string, unknown> }) => AsyncIterable<AgentMessage>) | null = null;

  return (args) => {
    const iter: AsyncIterable<AgentMessage> = {
      [Symbol.asyncIterator]() {
        return {
          started: false,
          async next() {
            if (!queryFn) {
              const sdk = await import("@anthropic-ai/claude-agent-sdk");
              queryFn = (sdk as { query: typeof queryFn }).query;
            }
            if (!this.started) {
              this.started = true;
              const actualIter = queryFn!(args);
              (this as Record<string, unknown>).innerIter = actualIter[Symbol.asyncIterator]();
            }
            const inner = (this as Record<string, unknown>).innerIter as AsyncIterator<AgentMessage>;
            return inner.next();
          },
        };
      },
    };
    return iter;
  };
}

function validateArtifact(artifact: Artifact): boolean {
  switch (artifact.type) {
    case "skill": return validateSkill(artifact.content, artifact.name).valid;
    case "claude_md_entry": return validateClaudeMdEntry(artifact.content).valid;
    case "conditional_rule": return validateConditionalRule(artifact.content).valid;
    case "slash_command": return validateSlashCommand(artifact.content, artifact.name).valid;
    case "subagent": return validateSubagent(artifact.content, artifact.name).valid;
  }
}

export async function memoryCommand(): Promise<void> {
  const projectDir = process.cwd();
  const paths = resolvePaths({ projectDir });
  const globalPaths = resolvePaths();
  const config = await loadConfig(paths.evolveDir);
  const patternDB = createPatternDB(paths.evolvePatterns);

  await patternDB.promoteValidated();

  const patterns = await patternDB.load();

  process.stdout.write("\x1b[2J\x1b[H");

  return new Promise<void>((resolve) => {
    const instance = render(
      <Memory
        patterns={patterns}
        onForget={async (id) => {
          await patternDB.markRejected(id);
        }}
        onForgetAll={async (ids) => {
          for (const id of ids) {
            await patternDB.markRejected(id);
          }
        }}
        onDeploy={async (ids) => {
          const agentQuery = createAgentQuery();

          for (const id of ids) {
            const stored = await patternDB.find(id);
            if (!stored) continue;

            const pattern = toAnalyzerPattern(stored);

            try {
              const artifacts = await buildAll({
                patterns: [pattern],
                deps: { agentQuery, model: config.model, maxBudgetUsd: config.maxBudgetUsd },
              });

              const valid = artifacts.filter(validateArtifact);
              if (valid.length === 0) continue;

              // TODO: scope from memory component (for now use project paths)
              await deploy({
                artifacts: valid,
                claudeDir: paths.claudeDir,
                evolveDir: paths.evolveDir,
                claudeMd: paths.claudeMd,
                rulesDir: paths.rulesDir,
                commandsDir: paths.commandsDir,
                agentsDir: paths.agentsDir,
              });

              await patternDB.updateState(id, "deployed");
            } catch {
              // silently skip failed builds
            }
          }
        }}
        onExit={() => {
          instance.unmount();
          resolve();
        }}
      />,
      { patchConsole: false },
    );
  });
}

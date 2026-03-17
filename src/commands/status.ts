import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import React from "react";
import { render } from "ink";
import { resolvePaths } from "../utils/paths.js";
import { rollback } from "../deployer/rollback.js";
import { createPatternDB } from "../db/patterns.js";
import { StatusView } from "../ui/components/status-view.js";
import type { DeployedArtifact } from "../ui/components/status-view.js";

type ArtifactType = "skill" | "claude_md_entry" | "conditional_rule" | "slash_command" | "subagent";

// scans a directory for files containing evolve markers
async function scanMarkedDirectory(
  dirPath: string,
  type: ArtifactType,
  locationPrefix: string,
): Promise<DeployedArtifact[]> {
  const artifacts: DeployedArtifact[] = [];
  const markerRe = /<!-- evolve:([a-z0-9-]+) -->/;

  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const s = await stat(entryPath);

      if (s.isDirectory()) {
        // scan files inside subdirectories (e.g. skills/name/SKILL.md)
        try {
          const files = await readdir(entryPath);
          for (const file of files) {
            const content = await readFile(join(entryPath, file), "utf-8");
            const match = content.match(markerRe);
            if (match) {
              artifacts.push({
                id: match[1],
                type,
                location: `${locationPrefix}/${entry}/${file}`,
              });
            }
          }
        } catch {
          // skip unreadable subdirs
        }
      } else if (s.isFile()) {
        // scan flat files (e.g. rules/name.md, commands/name.md, agents/name.md)
        try {
          const content = await readFile(entryPath, "utf-8");
          const match = content.match(markerRe);
          if (match) {
            artifacts.push({
              id: match[1],
              type,
              location: `${locationPrefix}/${entry}`,
            });
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  } catch {
    // directory may not exist
  }

  return artifacts;
}

// scans for deployed evolve artifacts in the project directory
async function scanArtifacts(
  claudeDir: string,
  claudeMd: string,
  rulesDir: string,
  commandsDir: string,
  agentsDir: string,
): Promise<DeployedArtifact[]> {
  const artifacts: DeployedArtifact[] = [];

  // scan skills directory (subdirectory based)
  const skillsDir = join(claudeDir, "skills");
  const skillArtifacts = await scanMarkedDirectory(skillsDir, "skill", "skills");
  artifacts.push(...skillArtifacts);

  // scan rules directory (flat files)
  const ruleArtifacts = await scanMarkedDirectory(rulesDir, "conditional_rule", "rules");
  artifacts.push(...ruleArtifacts);

  // scan commands directory (flat files)
  const commandArtifacts = await scanMarkedDirectory(commandsDir, "slash_command", "commands");
  artifacts.push(...commandArtifacts);

  // scan agents directory (flat files)
  const agentArtifacts = await scanMarkedDirectory(agentsDir, "subagent", "agents");
  artifacts.push(...agentArtifacts);

  // scan CLAUDE.md for marker sections
  try {
    const content = await readFile(claudeMd, "utf-8");
    const globalRe = /<!-- evolve:([a-z0-9-]+) -->/g;
    let match;
    while ((match = globalRe.exec(content)) !== null) {
      if (content.slice(Math.max(0, match.index - 2), match.index).includes("/")) continue;
      artifacts.push({
        id: match[1],
        type: "claude_md_entry",
        location: "CLAUDE.md",
      });
    }
  } catch {
    // CLAUDE.md may not exist
  }

  return artifacts;
}

// enrich artifacts with state and age from pattern database
async function enrichArtifacts(
  artifacts: DeployedArtifact[],
  patternsPath: string,
): Promise<DeployedArtifact[]> {
  const patternDB = createPatternDB(patternsPath);
  const now = Date.now();

  const enriched: DeployedArtifact[] = [];
  for (const artifact of artifacts) {
    const stored = await patternDB.find(artifact.id);
    if (stored) {
      const deployedMs = stored.deployedAt ? new Date(stored.deployedAt).getTime() : now;
      const daysSince = Math.floor((now - deployedMs) / (1000 * 60 * 60 * 24));
      enriched.push({
        ...artifact,
        state: stored.state,
        age: daysSince > 0 ? `${daysSince}d ago` : "today",
      });
    } else {
      enriched.push({ ...artifact, state: "deployed" });
    }
  }

  return enriched;
}

export async function statusCommand(): Promise<void> {
  const projectDir = process.cwd();
  const paths = resolvePaths({ projectDir });

  const rawArtifacts = await scanArtifacts(
    paths.claudeDir,
    paths.claudeMd,
    paths.rulesDir,
    paths.commandsDir,
    paths.agentsDir,
  );

  if (rawArtifacts.length === 0) {
    // clear screen for consistency
    process.stdout.write("\x1b[2J\x1b[H");
    console.log();
    console.log("  No evolve artifacts found.");
    console.log();
    return;
  }

  const artifacts = await enrichArtifacts(rawArtifacts, paths.evolvePatterns);

  return new Promise<void>((resolve) => {
    // clear screen for dashboard feel
    process.stdout.write("\x1b[2J\x1b[H");

    const instance = render(
      React.createElement(StatusView, {
        artifacts,
        onRollback: async (id: string) => {
          const result = await rollback({
            markerId: id,
            claudeDir: paths.claudeDir,
            claudeMd: paths.claudeMd,
            rulesDir: paths.rulesDir,
            commandsDir: paths.commandsDir,
            agentsDir: paths.agentsDir,
          });

          if (result.removed) {
            // mark pattern as rejected in the database
            const patternDB = createPatternDB(paths.evolvePatterns);
            await patternDB.markRejected(id);
          }
        },
        onExit: () => {
          instance.unmount();
          resolve();
        },
      }),
      { patchConsole: false },
    );
  });
}

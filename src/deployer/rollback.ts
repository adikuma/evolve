import { readFile, writeFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export interface RollbackOptions {
  markerId: string;
  claudeDir: string;
  claudeMd?: string;
  rulesDir?: string;
  commandsDir?: string;
  agentsDir?: string;
}

export interface RollbackResult {
  removed: boolean;
  details: string;
}

// removes a single marked file from a directory if the marker matches
async function removeMarkedFile(
  dirPath: string,
  markerId: string,
  label: string,
): Promise<string | null> {
  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      const filePath = join(dirPath, entry);
      const s = await stat(filePath);
      if (!s.isFile()) continue;

      const content = await readFile(filePath, "utf-8");
      if (new RegExp(`<!-- evolve:${markerId} -->`).test(content)) {
        await rm(filePath, { force: true });
        return `removed ${label}: ${entry}`;
      }
    }
  } catch {
    // directory may not exist
  }
  return null;
}

export async function rollback(options: RollbackOptions): Promise<RollbackResult> {
  const { markerId, claudeDir } = options;

  // validate marker id to prevent regex injection
  const SAFE_ID = /^[a-z0-9-]+$/;
  if (!SAFE_ID.test(markerId)) {
    return { removed: false, details: `invalid marker id: ${markerId}` };
  }

  let removedSomething = false;
  const details: string[] = [];

  // resolve paths with fallbacks for backward compatibility
  const claudeMd = options.claudeMd || join(claudeDir, "CLAUDE.md");
  const rulesDir = options.rulesDir || join(claudeDir, "rules");
  const commandsDir = options.commandsDir || join(claudeDir, "commands");
  const agentsDir = options.agentsDir || join(claudeDir, "agents");

  // check if skills/markerId/ exists and contains evolve marker
  const skillDir = join(claudeDir, "skills", markerId);
  try {
    const s = await stat(skillDir);
    if (s.isDirectory()) {
      // verify it has the evolve marker before removing
      const files = await readdir(skillDir);
      let hasMarker = false;
      for (const file of files) {
        const content = await readFile(join(skillDir, file), "utf-8");
        if (new RegExp(`<!-- evolve:${markerId} -->`).test(content)) {
          hasMarker = true;
          break;
        }
      }
      if (hasMarker) {
        await rm(skillDir, { recursive: true, force: true });
        removedSomething = true;
        details.push(`removed skill directory: skills/${markerId}`);
      }
    }
  } catch {
    // skill dir does not exist, that is fine
  }

  // check CLAUDE.md for marker section and remove it
  try {
    const content = await readFile(claudeMd, "utf-8");
    const markerRegex = new RegExp(
      `<!-- evolve:${markerId} -->[\\s\\S]*?<!-- /evolve:${markerId} -->`,
    );
    if (markerRegex.test(content)) {
      const cleaned = content.replace(markerRegex, "").replace(/\n{3,}/g, "\n\n").trim();
      await writeFile(claudeMd, cleaned + "\n", "utf-8");
      removedSomething = true;
      details.push(`removed claude.md section for ${markerId}`);
    }
  } catch {
    // no CLAUDE.md, that is fine
  }

  // check rules directory for marked files
  const ruleResult = await removeMarkedFile(rulesDir, markerId, "rule");
  if (ruleResult) {
    removedSomething = true;
    details.push(ruleResult);
  }

  // check commands directory for marked files
  const commandResult = await removeMarkedFile(commandsDir, markerId, "command");
  if (commandResult) {
    removedSomething = true;
    details.push(commandResult);
  }

  // check agents directory for marked files
  const agentResult = await removeMarkedFile(agentsDir, markerId, "agent");
  if (agentResult) {
    removedSomething = true;
    details.push(agentResult);
  }

  return {
    removed: removedSomething,
    details: details.length > 0 ? details.join("; ") : `no artifacts found for marker ${markerId}`,
  };
}

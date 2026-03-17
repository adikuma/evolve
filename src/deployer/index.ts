import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createBackup } from "./backup.js";

export interface Artifact {
  type: "skill" | "claude_md_entry" | "conditional_rule" | "slash_command" | "subagent";
  name: string;
  content: string;
}

export interface DeployOptions {
  artifacts: Artifact[];
  claudeDir: string;
  evolveDir: string;
  claudeMd?: string;
  rulesDir?: string;
  commandsDir?: string;
  agentsDir?: string;
}

export interface DeployedArtifactResult {
  name: string;
  type: string;
  action: "created" | "appended";
  filePath: string;
  linesAdded: number;
}

export interface DeployResult {
  deployed: DeployedArtifactResult[];
  backupPath: string;
}

// counts newlines in content
function countLines(content: string): number {
  return content.split("\n").length;
}

export async function deploy(options: DeployOptions): Promise<DeployResult> {
  const { artifacts, claudeDir, evolveDir } = options;
  const deployed: DeployedArtifactResult[] = [];

  // validate artifact names to prevent path traversal
  const SAFE_NAME = /^[a-z0-9-]+$/;
  for (const artifact of artifacts) {
    if (!SAFE_NAME.test(artifact.name)) {
      throw new Error(`unsafe artifact name: ${artifact.name}`);
    }
  }

  // resolve deployment paths with fallbacks for backward compatibility
  const claudeMd = options.claudeMd || join(claudeDir, "CLAUDE.md");
  const rulesDir = options.rulesDir || join(claudeDir, "rules");
  const commandsDir = options.commandsDir || join(claudeDir, "commands");
  const agentsDir = options.agentsDir || join(claudeDir, "agents");

  // create backup before any changes
  const backupDir = join(evolveDir, "backups");
  await mkdir(backupDir, { recursive: true });
  const backupPath = await createBackup(claudeDir, backupDir);

  for (const artifact of artifacts) {
    switch (artifact.type) {
      case "skill": {
        // create skills/name/ directory and write SKILL.md
        const skillDir = join(claudeDir, "skills", artifact.name);
        const filePath = join(skillDir, "SKILL.md");
        await mkdir(skillDir, { recursive: true });
        await writeFile(filePath, artifact.content, "utf-8");
        deployed.push({
          name: artifact.name,
          type: artifact.type,
          action: "created",
          filePath,
          linesAdded: countLines(artifact.content),
        });
        break;
      }
      case "claude_md_entry": {
        // read existing CLAUDE.md or start empty, then append
        let existing = "";
        try {
          existing = await readFile(claudeMd, "utf-8");
        } catch {
          // file does not exist yet, start fresh
        }
        const separator = existing.length > 0 ? "\n\n" : "";
        await writeFile(claudeMd, existing + separator + artifact.content, "utf-8");
        deployed.push({
          name: artifact.name,
          type: artifact.type,
          action: "appended",
          filePath: claudeMd,
          linesAdded: countLines(artifact.content),
        });
        break;
      }
      case "conditional_rule": {
        const filePath = join(rulesDir, artifact.name + ".md");
        await mkdir(rulesDir, { recursive: true });
        await writeFile(filePath, artifact.content, "utf-8");
        deployed.push({
          name: artifact.name,
          type: artifact.type,
          action: "created",
          filePath,
          linesAdded: countLines(artifact.content),
        });
        break;
      }
      case "slash_command": {
        const filePath = join(commandsDir, artifact.name + ".md");
        await mkdir(commandsDir, { recursive: true });
        await writeFile(filePath, artifact.content, "utf-8");
        deployed.push({
          name: artifact.name,
          type: artifact.type,
          action: "created",
          filePath,
          linesAdded: countLines(artifact.content),
        });
        break;
      }
      case "subagent": {
        const filePath = join(agentsDir, artifact.name + ".md");
        await mkdir(agentsDir, { recursive: true });
        await writeFile(filePath, artifact.content, "utf-8");
        deployed.push({
          name: artifact.name,
          type: artifact.type,
          action: "created",
          filePath,
          linesAdded: countLines(artifact.content),
        });
        break;
      }
    }
  }

  return { deployed, backupPath };
}

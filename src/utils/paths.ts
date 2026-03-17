import { join } from "node:path";
import { homedir } from "node:os";

export interface ResolvePathsOptions {
  home?: string;
  projectDir?: string;
}

export interface EvolvePaths {
  claudeDir: string;
  historyJsonl: string;
  projectsDir: string;
  contextLog: string;
  settingsJson: string;
  claudeMd: string;
  skillsDir: string;
  rulesDir: string;
  commandsDir: string;
  agentsDir: string;
  claudeJson: string;
  evolveDir: string;
  evolveConfig: string;
  evolveStaging: string;
  evolveBackups: string;
  evolveLogs: string;
  evolvePatterns: string;
  evolveRuns: string;
  projectDir: string;
}

// resolves all paths relative to home directory and optional project directory
// when projectDir is provided, deployment targets (claudeDir, claudeMd, skillsDir,
// rulesDir, commandsDir, agentsDir) resolve to the project instead of home
// evolve internal storage always lives at ~/.evolve/ regardless
// claude code data (history, projects, context, settings) always lives at ~/.claude/
export function resolvePaths(options?: ResolvePathsOptions | string): EvolvePaths {
  // support legacy string argument for backward compatibility
  const opts: ResolvePathsOptions = typeof options === "string"
    ? { home: options }
    : options || {};

  const h = opts.home || homedir();
  const globalClaudeDir = join(h, ".claude");
  const evolveDir = join(h, ".evolve");

  // deployment target: project scoped when projectDir is provided, otherwise global
  const deployBase = opts.projectDir || h;
  const claudeDir = join(deployBase, ".claude");

  return {
    // deployment targets (project scoped when projectDir provided)
    claudeDir,
    claudeMd: opts.projectDir ? join(deployBase, "CLAUDE.md") : join(claudeDir, "CLAUDE.md"),
    skillsDir: join(claudeDir, "skills"),
    rulesDir: join(claudeDir, "rules"),
    commandsDir: join(claudeDir, "commands"),
    agentsDir: join(claudeDir, "agents"),
    projectDir: opts.projectDir || h,

    // claude code data (always global)
    historyJsonl: join(globalClaudeDir, "history.jsonl"),
    projectsDir: join(globalClaudeDir, "projects"),
    contextLog: join(globalClaudeDir, "context-log.jsonl"),
    settingsJson: join(globalClaudeDir, "settings.json"),
    claudeJson: join(h, ".claude.json"),

    // evolve internal storage (always global at ~/.evolve/)
    evolveDir,
    evolveConfig: join(evolveDir, "config.json"),
    evolvePatterns: join(evolveDir, "patterns", "patterns.json"),
    evolveRuns: join(evolveDir, "runs", "runs.json"),
    evolveStaging: join(evolveDir, "staging"),
    evolveBackups: join(evolveDir, "backups"),
    evolveLogs: join(evolveDir, "logs"),
  };
}

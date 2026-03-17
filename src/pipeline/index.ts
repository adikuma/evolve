import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { glob } from "tinyglobby";
import { normalizePath } from "../utils/normalize-path.js";
import type { Pattern } from "../analyzer/schemas.js";
import type { EvolvePaths } from "../utils/paths.js";
import { resolvePaths } from "../utils/paths.js";
import type { EvolveConfig } from "../utils/config.js";
import type { Artifact, DeployedArtifactResult } from "../deployer/index.js";
import type { AgentMessage } from "../analyzer/index.js";
import { toAnalyzerPattern } from "../db/types.js";
import { parseAll } from "../parser/index.js";
import { parseSession } from "../parser/sessions.js";
import type { ParsedData } from "../parser/types.js";
import { analyze } from "../analyzer/index.js";
import { mergePatterns } from "../analyzer/merge.js";
import {
  buildAll,
  validateSkill,
  validateClaudeMdEntry,
  validateConditionalRule,
  validateSlashCommand,
  validateSubagent,
} from "../builder/index.js";
import { deploy } from "../deployer/index.js";
import { createPatternDB } from "../db/patterns.js";
import { createRunDB } from "../db/runs.js";

export interface SelectedPattern {
  pattern: Pattern;
  scope: "local" | "global";
}

export interface PipelineObserver {
  onPhase(phase: string, status: string, detail?: string): void;
  onPatterns(patterns: Pattern[]): Promise<SelectedPattern[]>;
  onBuild(name: string, status: string, errors?: string[]): void;
  onDeploy(artifacts: Artifact[], deployed: DeployedArtifactResult[], backupPath: string): void;
  onLearned(sentences: string[]): void;
  onComplete(summary: PipelineSummary): void;
  onError(phase: string, error: Error): void;
}

export interface PipelineSummary {
  sessionsAnalyzed: number;
  patternsDetected: number;
  patternsDeployed: number;
  patternsRejected: number;
  durationMs: number;
}

export interface PipelineOptions {
  paths: EvolvePaths;
  config: EvolveConfig;
  since: Date;
  auto: boolean;
  dryRun: boolean;
  fresh?: boolean;
  session?: string;
  mode: "interactive" | "cron";
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
}

// finds a session file by id in the projects directory
async function findSessionFile(projectsDir: string, sessionId: string): Promise<string | null> {
  try {
    const pattern = `${projectsDir}/**/${sessionId}.jsonl`.replace(/\\/g, "/");
    const matches = await glob([pattern]);
    if (matches.length > 0) return matches[0];

    // try partial match if full id didn't work
    const allFiles = await glob([`${projectsDir}/**/*.jsonl`.replace(/\\/g, "/")]);
    const partial = allFiles.find((f) => f.includes(sessionId));
    return partial || null;
  } catch {
    return null;
  }
}

// validates a single artifact, returns whether it passed
function validateArtifact(artifact: Artifact): { valid: boolean; errors: string[] } {
  switch (artifact.type) {
    case "skill":
      return validateSkill(artifact.content, artifact.name);
    case "claude_md_entry":
      return validateClaudeMdEntry(artifact.content);
    case "conditional_rule":
      return validateConditionalRule(artifact.content);
    case "slash_command":
      return validateSlashCommand(artifact.content, artifact.name);
    case "subagent":
      return validateSubagent(artifact.content, artifact.name);
  }
}

// resolves the display path for an artifact based on its type
export function artifactPath(artifact: Artifact, paths: EvolvePaths): string {
  switch (artifact.type) {
    case "skill":
      return formatDeployPath(join(paths.skillsDir, artifact.name, "SKILL.md"), paths);
    case "claude_md_entry":
      return formatDeployPath(paths.claudeMd, paths);
    case "conditional_rule":
      return formatDeployPath(join(paths.rulesDir, artifact.name + ".md"), paths);
    case "slash_command":
      return formatDeployPath(join(paths.commandsDir, artifact.name + ".md"), paths);
    case "subagent":
      return formatDeployPath(join(paths.agentsDir, artifact.name + ".md"), paths);
  }
}

// formats a deploy path as project relative or falls back to absolute
function formatDeployPath(absolutePath: string, paths: EvolvePaths): string {
  const rel = relative(paths.projectDir, absolutePath);
  if (rel && !rel.startsWith("..")) {
    return rel.replace(/\\/g, "/");
  }
  return absolutePath;
}

// returns a short label for the artifact type
export function artifactLabel(type: string | undefined): string {
  switch (type) {
    case "skill":
      return "skill";
    case "claude_md_entry":
      return "rule";
    case "conditional_rule":
      return "rule";
    case "slash_command":
      return "command";
    case "subagent":
      return "agent";
    default:
      return "unknown";
  }
}

// returns a usage hint for a deployed artifact
export function artifactUsage(artifact: Artifact): string {
  switch (artifact.type) {
    case "skill":
      return `/${artifact.name}`;
    case "claude_md_entry":
      return extractRuleSummary(artifact.content);
    case "conditional_rule":
      return artifact.name;
    case "slash_command":
      return `/${artifact.name}`;
    case "subagent":
      return artifact.name;
  }
}

// extracts a short rule summary from claude.md content
function extractRuleSummary(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("<!--")) continue;
    if (trimmed.startsWith("#")) continue;
    const clean = trimmed.replace(/[*_`]/g, "").slice(0, 60);
    return clean;
  }
  return "Rule added";
}

// generates plain english sentences from deployed pattern descriptions
function buildLearnedSentences(patterns: Pattern[], deployed: string[]): string[] {
  const deployedSet = new Set(deployed);
  return patterns
    .filter((p) => deployedSet.has(p.id))
    .map((p) => p.description);
}

// calls deploy with all the needed path fields from EvolvePaths
function deployWithPaths(artifacts: Artifact[], paths: EvolvePaths): ReturnType<typeof deploy> {
  return deploy({
    artifacts,
    claudeDir: paths.claudeDir,
    evolveDir: paths.evolveDir,
    claudeMd: paths.claudeMd,
    rulesDir: paths.rulesDir,
    commandsDir: paths.commandsDir,
    agentsDir: paths.agentsDir,
  });
}

// creates default file system deps for the parser
function createParseDeps(): {
  readFile: (p: string) => Promise<string>;
  glob: (pattern: string) => Promise<string[]>;
} {
  return {
    readFile: (p: string) => readFile(p, "utf-8"),
    glob: (pattern: string) => glob([pattern]),
  };
}

// build, validate, deploy, and record selected patterns
async function executePostSelection(
  selected: SelectedPattern[],
  allPatterns: Pattern[],
  sessionsAnalyzed: number,
  options: PipelineOptions,
  observer: PipelineObserver,
  patternDB: ReturnType<typeof createPatternDB>,
  runDB: ReturnType<typeof createRunDB>,
  startTime: number,
): Promise<void> {
  const { paths, config, mode, agentQuery } = options;
  const projectDir = paths.projectDir;
  const patterns = selected.map((s) => s.pattern);

  // phase: build
  observer.onPhase("Deploy", "active", "Building artifacts...");

  for (const p of patterns) {
    observer.onBuild(p.id, "building");
  }

  let artifacts: Artifact[];
  try {
    artifacts = await buildAll({
      patterns,
      deps: {
        agentQuery,
        model: config.model,
        maxBudgetUsd: config.maxBudgetUsd,
      },
    });
  } catch (err) {
    for (const p of patterns) {
      observer.onBuild(p.id, "failed");
    }
    observer.onError("Build", err instanceof Error ? err : new Error(String(err)));
    return;
  }

  // validate each artifact
  const validArtifacts: Artifact[] = [];
  for (const artifact of artifacts) {
    observer.onBuild(artifact.name, "testing");
    const result = validateArtifact(artifact);
    if (result.valid) {
      validArtifacts.push(artifact);
      observer.onBuild(artifact.name, "deploying");
    } else {
      observer.onBuild(artifact.name, "failed", result.errors);
    }
  }

  if (validArtifacts.length === 0) {
    observer.onError("Validate", new Error("All artifacts failed validation."));
    return;
  }

  // build scope map from selected patterns (pattern id -> scope)
  const scopeMap = new Map<string, "local" | "global">();
  for (const s of selected) {
    scopeMap.set(s.pattern.id, s.scope);
  }

  // split valid artifacts by scope
  const localArtifacts = validArtifacts.filter((a) => scopeMap.get(a.name) !== "global");
  const globalArtifacts = validArtifacts.filter((a) => scopeMap.get(a.name) === "global");

  // phase: deploy
  observer.onPhase("Deploy", "active", `Deploying ${validArtifacts.length} artifacts...`);

  // deploy local artifacts with project paths
  let allDeployed: DeployedArtifactResult[] = [];
  let backupPath = "";

  if (localArtifacts.length > 0) {
    const localResult = await deployWithPaths(localArtifacts, paths);
    allDeployed = allDeployed.concat(localResult.deployed);
    backupPath = localResult.backupPath;
  }

  // deploy global artifacts with home based paths
  if (globalArtifacts.length > 0) {
    const globalPaths = resolvePaths();
    const globalResult = await deployWithPaths(globalArtifacts, globalPaths);
    allDeployed = allDeployed.concat(globalResult.deployed);
    if (!backupPath) {
      backupPath = globalResult.backupPath;
    }
  }

  const deployedNames = allDeployed.map((d) => d.name);

  for (const name of deployedNames) {
    observer.onBuild(name, "done");
  }

  // update pattern db with deployed state and artifact content
  for (const name of deployedNames) {
    await patternDB.updateState(name, "deployed");
    const stored = await patternDB.find(name);
    if (stored) {
      const artifact = validArtifacts.find((a) => a.name === name);
      if (artifact) {
        // use the correct paths based on scope
        const isGlobal = scopeMap.get(name) === "global";
        const targetPaths = isGlobal ? resolvePaths() : paths;
        stored.artifact = {
          content: artifact.content,
          filePath: artifactPath(artifact, targetPaths),
        };
        stored.source = "custom";
        stored.project = projectDir;
        await patternDB.upsert(stored);
      }
    }
  }

  // mark skipped patterns as rejected in db
  const selectedIds = new Set(patterns.map((p) => p.id));
  for (const p of allPatterns) {
    if (!selectedIds.has(p.id)) {
      await patternDB.updateState(p.id, "rejected");
    }
  }

  observer.onPhase("Deploy", "done", `${deployedNames.length} deployed`);
  observer.onDeploy(validArtifacts, allDeployed, backupPath);

  // generate learned sentences from deployed patterns
  const sentences = buildLearnedSentences(patterns, deployedNames);
  if (sentences.length > 0) {
    observer.onLearned(sentences);
  }

  const patternsRejected = allPatterns.length - patterns.length;

  // record this run
  await runDB.append({
    id: `${mode}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    sessionsAnalyzed,
    patternsDetected: allPatterns.length,
    patternsDeployed: deployedNames.length,
    patternsRejected,
    durationMs: Date.now() - startTime,
    mode,
  });

  observer.onComplete({
    sessionsAnalyzed,
    patternsDetected: allPatterns.length,
    patternsDeployed: deployedNames.length,
    patternsRejected,
    durationMs: Date.now() - startTime,
  });
}

// core pipeline: parse -> analyze -> select -> build -> validate -> deploy -> record
export async function executePipeline(
  options: PipelineOptions,
  observer: PipelineObserver,
): Promise<void> {
  const { paths, config, since, dryRun, mode, agentQuery } = options;
  const projectDir = paths.projectDir;
  const startTime = Date.now();

  const patternDB = createPatternDB(paths.evolvePatterns);
  const runDB = createRunDB(paths.evolveRuns);

  try {
    // promote patterns that have been deployed long enough
    await patternDB.promoteValidated();

    // check for pending patterns
    if (!dryRun && !options.fresh) {
      const existingPatterns = await patternDB.load();
      const pendingPatterns = existingPatterns
        .filter((p) => p.state === "detected" && normalizePath(p.project) === normalizePath(projectDir));

      if (pendingPatterns.length > 0) {
        // convert stored patterns back to analyzer format for the observer
        const patterns = pendingPatterns.map((p) => toAnalyzerPattern(p));

        observer.onPhase("Parse", "done", "skipped (using pending patterns)");
        observer.onPhase("Analyze", "done", `${patterns.length} pending patterns`);

        // go straight to selection
        observer.onPhase("Select", "active");
        const selected = await observer.onPatterns(patterns);

        if (selected.length === 0) {
          observer.onPhase("Select", "done", "No patterns selected");
          observer.onComplete({
            sessionsAnalyzed: 0,
            patternsDetected: patterns.length,
            patternsDeployed: 0,
            patternsRejected: 0,
            durationMs: Date.now() - startTime,
          });
          return;
        }

        observer.onPhase("Select", "done", `${selected.length} selected`);
        await executePostSelection(selected, patterns, 0, options, observer, patternDB, runDB, startTime);
        return;
      }
    }

    // phase: parse
    let data: ParsedData;

    if (options.session) {
      // single session mode: parse just one session file
      observer.onPhase("Parse", "active", `Reading session ${options.session.slice(0, 8)}...`);
      const sessionPath = await findSessionFile(paths.projectsDir, options.session);
      if (!sessionPath) {
        observer.onPhase("Parse", "failed", `Session ${options.session} not found`);
        observer.onComplete({
          sessionsAnalyzed: 0,
          patternsDetected: 0,
          patternsDeployed: 0,
          patternsRejected: 0,
          durationMs: Date.now() - startTime,
        });
        return;
      }
      const content = await readFile(sessionPath, "utf-8");
      const session = parseSession(content, options.session);
      data = {
        sessions: session.turnCount > 0 ? [session] : [],
        totalSessions: 1,
        fileAccessCounts: {},
        timeRange: { from: session.startTime, to: session.endTime },
      };
    } else {
      // normal mode: parse all sessions in time range
      observer.onPhase("Parse", "active", "Reading sessions...");
      data = await parseAll({
        historyPath: paths.historyJsonl,
        contextLogPath: paths.contextLog,
        projectsDir: paths.projectsDir,
        since,
        deps: createParseDeps(),
      });
    }

    observer.onPhase("Parse", "done", `${data.totalSessions} session${data.totalSessions !== 1 ? "s" : ""}, ${data.sessions.length} with data`);

    if (data.sessions.length === 0) {
      observer.onComplete({
        sessionsAnalyzed: 0,
        patternsDetected: 0,
        patternsDeployed: 0,
        patternsRejected: 0,
        durationMs: Date.now() - startTime,
      });
      return;
    }

    // dry run stops after parsing
    if (dryRun) {
      observer.onComplete({
        sessionsAnalyzed: data.sessions.length,
        patternsDetected: 0,
        patternsDeployed: 0,
        patternsRejected: 0,
        durationMs: Date.now() - startTime,
      });
      return;
    }

    // phase: analyze
    const existingPatterns = await patternDB.load();
    const activeCount = existingPatterns.filter((p) => p.state === "deployed" || p.state === "validated").length;
    const rejectedCount = existingPatterns.filter((p) => p.state === "rejected").length;

    if (activeCount > 0 || rejectedCount > 0) {
      observer.onPhase("Analyze", "active", `${activeCount} active, ${rejectedCount} rejected in memory`);
    } else {
      observer.onPhase("Analyze", "active", "Sending to LLM...");
    }

    // brief delay so the user sees the context message before the llm call
    await new Promise((r) => setTimeout(r, 100));
    observer.onPhase("Analyze", "active", `Analyzing ${data.sessions.length} sessions with ${config.model}...`);

    const analysis = await analyze({
      data,
      deps: {
        agentQuery,
        model: config.model,
        maxBudgetUsd: config.maxBudgetUsd,
      },
      existingPatterns,
    });

    // merge new detections into pattern db
    if (analysis.patterns.length > 0) {
      const merged = mergePatterns(existingPatterns, analysis.patterns);
      for (const p of merged) {
        p.project = projectDir;
        await patternDB.upsert(p);
      }
    }

    observer.onPhase("Analyze", "done", `${analysis.patterns.length} patterns found`);

    if (analysis.patterns.length === 0) {
      await runDB.append({
        id: `${mode}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sessionsAnalyzed: data.sessions.length,
        patternsDetected: 0,
        patternsDeployed: 0,
        patternsRejected: 0,
        durationMs: Date.now() - startTime,
        mode,
      });
      observer.onComplete({
        sessionsAnalyzed: data.sessions.length,
        patternsDetected: 0,
        patternsDeployed: 0,
        patternsRejected: 0,
        durationMs: Date.now() - startTime,
      });
      return;
    }

    // phase: select (observer decides how to pick patterns)
    observer.onPhase("Select", "active");

    const selected = await observer.onPatterns(analysis.patterns);

    if (selected.length === 0) {
      observer.onPhase("Select", "done", "No patterns selected");
      await runDB.append({
        id: `${mode}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sessionsAnalyzed: data.sessions.length,
        patternsDetected: analysis.patterns.length,
        patternsDeployed: 0,
        patternsRejected: 0,
        durationMs: Date.now() - startTime,
        mode,
      });
      observer.onComplete({
        sessionsAnalyzed: data.sessions.length,
        patternsDetected: analysis.patterns.length,
        patternsDeployed: 0,
        patternsRejected: 0,
        durationMs: Date.now() - startTime,
      });
      return;
    }

    observer.onPhase("Select", "done", `${selected.length} selected`);

    await executePostSelection(
      selected,
      analysis.patterns,
      data.sessions.length,
      options,
      observer,
      patternDB,
      runDB,
      startTime,
    );
  } catch (err) {
    observer.onError("Pipeline", err instanceof Error ? err : new Error(String(err)));
  }
}

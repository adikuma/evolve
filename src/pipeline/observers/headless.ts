import type { Pattern } from "../../analyzer/schemas.js";
import type { Artifact, DeployedArtifactResult } from "../../deployer/index.js";
import type { EvolveConfig } from "../../utils/config.js";
import type { EvolvePaths } from "../../utils/paths.js";
import type { PipelineObserver, PipelineSummary, SelectedPattern } from "../index.js";
import { artifactPath } from "../index.js";

export interface HeadlessObserverOptions {
  config: EvolveConfig;
  paths: EvolvePaths;
}

export function createHeadlessObserver(options: HeadlessObserverOptions): PipelineObserver {
  const { config, paths } = options;

  // accumulate deploy results for final json output
  let deployedArtifacts: Artifact[] = [];
  let deployedResults: DeployedArtifactResult[] = [];
  let backupPathResult: string | null = null;
  let learnedSentences: string[] = [];

  function log(msg: string): void {
    process.stderr.write(`[evolve] ${msg}\n`);
  }

  return {
    onPhase(phase: string, status: string, detail?: string) {
      if (detail) {
        log(`${phase}: ${detail}`);
      } else {
        log(`${phase}: ${status}`);
      }
    },

    async onPatterns(patterns: Pattern[]): Promise<SelectedPattern[]> {
      const selected = patterns
        .filter((p) => p.confidence >= config.autoSelectThreshold)
        .map((p) => ({ pattern: p, scope: "local" as const }));
      log(`Select: ${selected.length} auto-selected (threshold ${config.autoSelectThreshold})`);
      return selected;
    },

    onBuild(name: string, status: string, errors?: string[]) {
      if (status === "failed" && errors && errors.length > 0) {
        log(`Validation failed for ${name}: ${errors[0]}`);
      } else {
        log(`Build: ${name} ${status}`);
      }
    },

    onDeploy(artifacts: Artifact[], deployed: DeployedArtifactResult[], backupPath: string) {
      deployedArtifacts = artifacts;
      deployedResults = deployed;
      backupPathResult = backupPath;
      log(`Deploy: ${deployed.length} deployed`);
    },

    onLearned(sentences: string[]) {
      learnedSentences = sentences;
    },

    onComplete(summary: PipelineSummary) {
      const deployedNameSet = new Set(deployedResults.map((d) => d.name));
      const artifactSummary = deployedArtifacts
        .filter((a) => deployedNameSet.has(a.name))
        .map((a) => {
          const result = deployedResults.find((d) => d.name === a.name);
          return {
            name: a.name,
            type: a.type,
            path: artifactPath(a, paths),
            action: result?.action ?? "created",
            linesAdded: result?.linesAdded ?? 0,
            status: "deployed" as const,
          };
        });

      process.stdout.write(JSON.stringify({
        version: "0.1.0",
        timestamp: new Date().toISOString(),
        sessions_analyzed: summary.sessionsAnalyzed,
        patterns_found: summary.patternsDetected,
        patterns_deployed: summary.patternsDeployed,
        artifacts: artifactSummary,
        learned: learnedSentences,
        backup_path: backupPathResult,
        elapsed_seconds: Number((summary.durationMs / 1000).toFixed(1)),
      }, null, 2) + "\n");
    },

    onError(phase: string, error: Error) {
      log(`${phase} failed: ${error.message}`);
      process.exitCode = 1;
    },
  };
}

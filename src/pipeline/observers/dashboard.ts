import type { Pattern } from "../../analyzer/schemas.js";
import type { Artifact, DeployedArtifactResult } from "../../deployer/index.js";
import type { DashboardApi } from "../../ui/renderer.js";
import type { EvolveConfig } from "../../utils/config.js";
import type { EvolvePaths } from "../../utils/paths.js";
import type { PipelineObserver, PipelineSummary, SelectedPattern } from "../index.js";
import { artifactPath, artifactUsage } from "../index.js";
import { resolvePaths } from "../../utils/paths.js";

// maps phase names to their index in the dashboard
const phaseIndex: Record<string, number> = {
  Parse: 0,
  Analyze: 1,
  Select: 2,
  Deploy: 3,
};

export interface DashboardObserverOptions {
  dashboard: DashboardApi;
  config: EvolveConfig;
  paths: EvolvePaths;
  auto: boolean;
  sessionCount?: number;
}

export function createDashboardObserver(options: DashboardObserverOptions): PipelineObserver {
  const { dashboard, config, paths, auto } = options;
  let sessionCount = 0;
  let patternCount = 0;
  const scopeMap = new Map<string, "local" | "global">();

  return {
    onPhase(phase: string, status: string, detail?: string) {
      const idx = phaseIndex[phase];
      if (idx !== undefined) {
        dashboard.setPhase(idx, status as "active" | "done" | "failed" | "pending", detail);
      }
    },

    async onPatterns(patterns: Pattern[]): Promise<SelectedPattern[]> {
      if (auto) {
        const selected = patterns
          .filter((p) => p.confidence >= config.autoSelectThreshold)
          .map((p) => ({ pattern: p, scope: "local" as const }));
        for (const s of selected) {
          scopeMap.set(s.pattern.id, s.scope);
        }
        dashboard.setPhase(2, "done", `${selected.length} auto-selected`);
        return selected;
      }

      const picked = await dashboard.showPicker(patterns);
      if (!picked || picked.length === 0) {
        dashboard.setPhase(2, "done", "Skipped by user");
        return [];
      }

      for (const s of picked) {
        scopeMap.set(s.pattern.id, s.scope);
      }
      dashboard.setPhase(2, "done", `${picked.length} selected`);
      return picked;
    },

    onBuild(name: string, status: string, errors?: string[]) {
      dashboard.updateBuild(name, status as "pending" | "building" | "testing" | "deploying" | "done" | "failed", errors?.[0]);
    },

    onDeploy(artifacts: Artifact[], deployed: DeployedArtifactResult[], backupPath: string) {
      const deployedNames = new Set(deployed.map((d) => d.name));

      const deployedItems = artifacts
        .filter((a) => deployedNames.has(a.name))
        .map((a) => {
          const result = deployed.find((d) => d.name === a.name);
          const scope = scopeMap.get(a.name) || "local";
          const targetPaths = scope === "global" ? resolvePaths() : paths;
          return {
            name: a.name,
            type: a.type,
            path: artifactPath(a, targetPaths),
            usage: artifactUsage(a),
            action: result?.action ?? ("created" as const),
            linesAdded: result?.linesAdded ?? 0,
            scope,
          };
        });

      const diffs = artifacts
        .filter((a) => deployedNames.has(a.name))
        .map((a) => {
          const scope = scopeMap.get(a.name) || "local";
          const targetPaths = scope === "global" ? resolvePaths() : paths;
          return {
            name: a.name,
            type: a.type,
            content: a.content,
            filePath: artifactPath(a, targetPaths),
          };
        });

      dashboard.showDeployed(deployedItems, backupPath, diffs);
    },

    onLearned(sentences: string[]) {
      dashboard.showLearned(sentences);
    },

    onComplete(summary: PipelineSummary) {
      sessionCount = summary.sessionsAnalyzed;
      patternCount = summary.patternsDetected;

      if (summary.sessionsAnalyzed === 0) {
        dashboard.showEmpty("No sessions found in the specified time range.");
      } else if (summary.patternsDetected === 0 && summary.patternsDeployed === 0) {
        dashboard.showEmpty("No patterns detected.");
      }

      const elapsed = (summary.durationMs / 1000).toFixed(1);
      const parts = [config.model, `${summary.sessionsAnalyzed} sessions`];

      if (summary.patternsDetected > 0) {
        parts.push(`${summary.patternsDetected} patterns`);
      }
      if (summary.patternsDeployed > 0) {
        parts.push(`${summary.patternsDeployed} deployed`);
      }
      parts.push(`${elapsed}s`);

      dashboard.setStatus(parts);
    },

    onError(phase: string, error: Error) {
      const idx = phaseIndex[phase] ?? 3;
      dashboard.setPhase(idx, "failed", `${phase} failed: ${error.message}`);
    },
  };
}

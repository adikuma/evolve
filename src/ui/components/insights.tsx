import React from "react";
import { Box, Text } from "ink";
import { theme, glyph } from "../theme.js";
import type { StoredPattern } from "../../db/types.js";
import type { RunRecord } from "../../db/types.js";
import type { RunStats } from "../../db/runs.js";

export interface InsightsData {
  stats: RunStats;
  patterns: StoredPattern[];
  recentRuns: RunRecord[];
}

// state label with color
function stateColor(state: string): string {
  switch (state) {
    case "validated": return theme.success;
    case "deployed": return theme.accent;
    case "detected": return theme.dim;
    case "rejected": return theme.error;
    default: return theme.dim;
  }
}

// state glyph
function stateGlyph(state: string): string {
  switch (state) {
    case "validated": return glyph.done;
    case "deployed": return glyph.active;
    case "detected": return glyph.pending;
    case "rejected": return glyph.failed;
    default: return glyph.pending;
  }
}

// format days ago
function daysAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

// format mode label
function modeLabel(mode: string): string {
  switch (mode) {
    case "interactive": return "manual";
    case "cron": return "cron";
    default: return mode;
  }
}

const STAT_LABEL_WIDTH = 22;

function OverviewSection({ stats, patterns }: { stats: RunStats; patterns: StoredPattern[] }) {
  const validated = patterns.filter((p) => p.state === "validated").length;
  const deployed = patterns.filter((p) => p.state === "deployed").length;
  const detected = patterns.filter((p) => p.state === "detected").length;
  const rejected = patterns.filter((p) => p.state === "rejected").length;

  const entries = [
    { label: "total runs", value: String(stats.totalRuns) },
    { label: "sessions analyzed", value: String(stats.totalSessionsAnalyzed) },
    { label: "patterns detected", value: String(detected + deployed + validated + rejected) },
    { label: "patterns deployed", value: String(deployed) },
    { label: "patterns validated", value: String(validated) },
    { label: "patterns rejected", value: String(rejected) },
  ];

  return (
    <Box flexDirection="column" paddingX={2}>
      <Text color={theme.dim}>OVERVIEW</Text>
      {entries.map((entry) => (
        <Box key={entry.label}>
          <Text color={theme.dim}>  {entry.label.padEnd(STAT_LABEL_WIDTH)}</Text>
          <Text color={theme.fg}>{entry.value}</Text>
        </Box>
      ))}
    </Box>
  );
}

function DeploymentsSection({ patterns }: { patterns: StoredPattern[] }) {
  const active = patterns
    .filter((p) => p.state === "deployed" || p.state === "validated")
    .sort((a, b) => {
      const aDate = a.deployedAt || a.detectedAt;
      const bDate = b.deployedAt || b.detectedAt;
      return bDate.localeCompare(aDate);
    });

  if (active.length === 0) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text color={theme.dim}>ACTIVE DEPLOYMENTS</Text>
        <Box>
          <Text color={theme.muted}>  no active deployments</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      <Text color={theme.dim}>ACTIVE DEPLOYMENTS</Text>
      {active.map((p) => {
        const label = p.solutionType === "skill" ? "skill"
          : p.solutionType === "claude_md_entry" ? "rule"
          : "mcp";
        const age = daysAgo(p.deployedAt);

        return (
          <Box key={p.id}>
            <Text color={stateColor(p.state)}>{stateGlyph(p.state)} </Text>
            <Text color={theme.fg}>{p.id.padEnd(26)}</Text>
            <Text color={theme.dim}>{label.padEnd(10)}</Text>
            <Text color={theme.dim}>{p.state.padEnd(12)}</Text>
            <Text color={theme.muted}>{age}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

function RecentRunsSection({ runs }: { runs: RunRecord[] }) {
  if (runs.length === 0) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text color={theme.dim}>RECENT RUNS</Text>
        <Box>
          <Text color={theme.muted}>  no runs recorded</Text>
        </Box>
      </Box>
    );
  }

  // show most recent first
  const sorted = [...runs].reverse();

  return (
    <Box flexDirection="column" paddingX={2}>
      <Text color={theme.dim}>RECENT RUNS</Text>
      {sorted.map((run) => {
        const date = run.timestamp.slice(0, 10);
        const mode = modeLabel(run.mode);
        const duration = (run.durationMs / 1000).toFixed(1);

        return (
          <Box key={run.id}>
            <Text color={theme.dim}>  {date}  </Text>
            <Text color={theme.body}>{mode.padEnd(10)}</Text>
            <Text color={theme.fg}>{String(run.sessionsAnalyzed).padStart(3)} sessions  </Text>
            <Text color={theme.fg}>{String(run.patternsDetected).padStart(2)} patterns  </Text>
            <Text color={theme.accent}>{String(run.patternsDeployed).padStart(2)} deployed  </Text>
            <Text color={theme.muted}>{duration}s</Text>
          </Box>
        );
      })}
    </Box>
  );
}

export function Insights({ data }: { data: InsightsData }) {
  return (
    <Box flexDirection="column" gap={1}>
      <OverviewSection stats={data.stats} patterns={data.patterns} />
      <DeploymentsSection patterns={data.patterns} />
      <RecentRunsSection runs={data.recentRuns} />
    </Box>
  );
}

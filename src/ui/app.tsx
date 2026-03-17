import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, glyph } from "./theme.js";
import { Pipeline } from "./components/pipeline.js";
import type { Phase } from "./components/pipeline.js";
import { Patterns } from "./components/patterns.js";
import { Picker } from "./components/picker.js";
import { BuildTracker } from "./components/build-tracker.js";
import type { BuildTask } from "./components/build-tracker.js";
import { DeployReceipt } from "./components/deploy-receipt.js";
import type { DeployedItem } from "./components/deploy-receipt.js";
import { DiffView } from "./components/diff-view.js";
import type { DiffEntry } from "./components/diff-view.js";
import { StatusLine } from "./components/status-line.js";
import { Summary } from "./components/summary.js";
import type { SummarySection } from "./components/summary.js";
import { SectionDivider } from "./components/section-divider.js";
import type { Pattern } from "../analyzer/schemas.js";
import type { SelectedPattern } from "../pipeline/index.js";

// view states the app can be in
export type AppView =
  | { type: "pipeline" }
  | { type: "patterns"; patterns: Pattern[] }
  | { type: "picking"; patterns: Pattern[] }
  | { type: "building"; tasks: BuildTask[] }
  | { type: "deployed"; items: DeployedItem[]; backupPath: string; diffs: DiffEntry[]; learned?: string[] }
  | { type: "dry-run"; sections: SummarySection[] }
  | { type: "empty"; message: string };

export interface AppProps {
  subtitle?: string;
  phases: Phase[];
  view: AppView;
  statusParts?: string[];
  interactive?: boolean;
  onPickerSelect?: (selected: SelectedPattern[] | null) => void;
  onExit?: () => void;
}

// separate component for keyboard handling (only rendered when interactive + deployed)
function DeployedKeyHandler({ onToggleDiff, onExit }: { onToggleDiff: () => void; onExit?: () => void }) {
  useInput((input, key) => {
    if (input === "d") onToggleDiff();
    if (input === "q" || (key.ctrl && input === "c")) onExit?.();
  });
  return null;
}

export function App({ subtitle, phases, view, statusParts, interactive, onPickerSelect, onExit }: AppProps) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* badge header */}
      <Box marginBottom={1}>
        <Text bold color={theme.accent}>{glyph.badge}</Text>
        {subtitle && <Text color={theme.dim}>  {subtitle}</Text>}
      </Box>

      {/* pipeline phases */}
      <Pipeline phases={phases} />

      {/* content area based on current view */}
      {view.type === "patterns" && (
        <>
          <SectionDivider label="Patterns" />
          <Box marginTop={1}>
            <Patterns patterns={view.patterns} />
          </Box>
        </>
      )}

      {view.type === "picking" && (
        <>
          <SectionDivider label="Patterns" />
          <Box marginTop={1}>
            <Patterns patterns={view.patterns} />
          </Box>
          <SectionDivider label="Deploy" />
          <Box marginTop={1}>
            <Picker patterns={view.patterns} onSelect={onPickerSelect || (() => {})} />
          </Box>
        </>
      )}

      {view.type === "building" && (
        <>
          <SectionDivider label="Build" />
          <Box marginTop={1}>
            <BuildTracker tasks={view.tasks} />
          </Box>
        </>
      )}

      {view.type === "deployed" && (
        <>
          <SectionDivider label="Deployed" />
          <Box marginTop={1}>
            <DeployReceipt items={view.items} backupPath={view.backupPath} learned={view.learned} />
          </Box>

          {showDiff && view.diffs.length > 0 && (
            <>
              <SectionDivider label="Changes" />
              <Box marginTop={1}>
                <DiffView diffs={view.diffs} />
              </Box>
            </>
          )}

          {interactive && (
            <>
              <Box paddingX={2} marginTop={1}>
                <Text color={theme.muted}>
                  Press d to {showDiff ? "hide" : "show"} changes, q to exit
                </Text>
              </Box>
              <DeployedKeyHandler
                onToggleDiff={() => setShowDiff((prev) => !prev)}
                onExit={onExit}
              />
            </>
          )}
        </>
      )}

      {view.type === "dry-run" && (
        <>
          <SectionDivider label="Summary" />
          <Box marginTop={1}>
            <Summary sections={view.sections} />
          </Box>
        </>
      )}

      {view.type === "empty" && (
        <Box paddingX={2} marginTop={1}>
          <Text color={theme.dim}>{view.message}</Text>
        </Box>
      )}

      {/* status line with triangle prefix */}
      {statusParts && statusParts.length > 0 && (
        <StatusLine parts={statusParts} />
      )}
    </Box>
  );
}

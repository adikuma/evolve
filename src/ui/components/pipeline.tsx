import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { theme, glyph } from "../theme.js";

export interface Phase {
  label: string;
  status: "pending" | "active" | "done" | "failed";
  detail?: string;
}

interface PipelineProps {
  phases: Phase[];
}

const LABEL_WIDTH = 10;

function dotChar(status: Phase["status"]): string {
  switch (status) {
    case "pending": return glyph.pending;
    case "active":  return glyph.active;
    case "done":    return glyph.done;
    case "failed":  return glyph.failed;
  }
}

function dotColor(status: Phase["status"]): string {
  switch (status) {
    case "pending": return theme.muted;
    case "active":  return theme.accent;
    case "done":    return theme.success;
    case "failed":  return theme.error;
  }
}

function labelColor(status: Phase["status"]): string {
  switch (status) {
    case "pending": return theme.muted;
    case "active":  return theme.fg;
    case "done":    return theme.dim;
    case "failed":  return theme.error;
  }
}

export function Pipeline({ phases }: PipelineProps) {
  return (
    <Box flexDirection="column" paddingX={2}>
      {phases.map((phase) => (
        <Box key={phase.label}>
          {phase.status === "active" ? (
            <Text color={theme.accent}><Spinner type="dots" /></Text>
          ) : (
            <Text color={dotColor(phase.status)}>{dotChar(phase.status)}</Text>
          )}
          <Text color={labelColor(phase.status)}> {phase.label.padEnd(LABEL_WIDTH)}</Text>
          {phase.detail && (
            <>
              <Text color={theme.dim}> {"\u2014"} </Text>
              <Text color={phase.status === "active" ? theme.accent : theme.dim}>
                {phase.detail}
              </Text>
            </>
          )}
        </Box>
      ))}
    </Box>
  );
}

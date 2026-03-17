import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { theme, glyph } from "../theme.js";

export type BuildStatus = "pending" | "building" | "testing" | "deploying" | "done" | "failed";

export interface BuildTask {
  name: string;
  status: BuildStatus;
  detail?: string;
}

interface BuildTrackerProps {
  tasks: BuildTask[];
}

const NAME_WIDTH = 28;

function dotChar(status: BuildStatus): string {
  switch (status) {
    case "pending":   return glyph.pending;
    case "building":
    case "testing":
    case "deploying": return glyph.active;
    case "done":      return glyph.done;
    case "failed":    return glyph.failed;
  }
}

function dotColor(status: BuildStatus): string {
  switch (status) {
    case "pending":   return theme.muted;
    case "building":  return theme.accent;
    case "testing":   return theme.warning;
    case "deploying": return theme.accent;
    case "done":      return theme.success;
    case "failed":    return theme.error;
  }
}

function statusLabel(status: BuildStatus): string {
  switch (status) {
    case "pending":   return "";
    case "building":  return "generating...";
    case "testing":   return "validating...";
    case "deploying": return "deploying...";
    case "done":      return "done";
    case "failed":    return "failed";
  }
}

function isActive(status: BuildStatus): boolean {
  return status === "building" || status === "testing" || status === "deploying";
}

export function BuildTracker({ tasks }: BuildTrackerProps) {
  const maxName = Math.max(NAME_WIDTH, ...tasks.map((t) => t.name.length + 2));

  return (
    <Box flexDirection="column" paddingX={2}>
      {tasks.map((task) => {
        const label = statusLabel(task.status);
        const detailText = task.status === "failed" && task.detail ? ` - ${task.detail}` : "";

        return (
          <Box key={task.name}>
            {isActive(task.status) ? (
              <Text color={theme.accent}><Spinner type="dots" /></Text>
            ) : (
              <Text color={dotColor(task.status)}>{dotChar(task.status)}</Text>
            )}
            <Text bold color={task.status === "done" ? theme.dim : theme.fg}>
              {" "}{task.name.padEnd(maxName)}
            </Text>
            {label && (
              <Text color={task.status === "done" ? theme.success : task.status === "failed" ? theme.error : theme.dim}>
                {label}{detailText}
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

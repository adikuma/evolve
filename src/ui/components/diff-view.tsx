import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

export interface DiffEntry {
  name: string;
  type: "skill" | "claude_md_entry" | "conditional_rule" | "slash_command" | "subagent";
  content: string;
  filePath: string;
}

interface DiffViewProps {
  diffs: DiffEntry[];
}

const MAX_LINES = 12;

export function DiffView({ diffs }: DiffViewProps) {
  return (
    <Box flexDirection="column" paddingX={2}>
      {diffs.map((diff, i) => {
        const lines = diff.content.split("\n").filter((l) => l.length > 0);
        const shown = lines.slice(0, MAX_LINES);
        const remaining = lines.length - shown.length;

        return (
          <Box key={diff.name} flexDirection="column" marginBottom={i < diffs.length - 1 ? 1 : 0}>
            <Box>
              <Text color={theme.dim}>{diff.filePath}</Text>
            </Box>
            {shown.map((line, j) => (
              <Box key={j}>
                <Text color={theme.success}>+ {line}</Text>
              </Box>
            ))}
            {remaining > 0 && (
              <Box>
                <Text color={theme.dim}>... +{remaining} more lines</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

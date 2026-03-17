import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

export interface SummaryEntry {
  label: string;
  value: string;
  detail?: string;
}

export interface SummarySection {
  title: string;
  entries: SummaryEntry[];
}

interface SummaryProps {
  sections: SummarySection[];
}

const LABEL_WIDTH = 16;

export function Summary({ sections }: SummaryProps) {
  return (
    <Box flexDirection="column" paddingX={2}>
      {sections.map((section, si) => (
        <Box key={section.title} flexDirection="column" marginBottom={si < sections.length - 1 ? 1 : 0}>
          <Box>
            <Text color={theme.dim}>{section.title.toUpperCase()}</Text>
          </Box>
          {section.entries.map((entry) => (
            <Box key={entry.label} flexDirection="column">
              <Box>
                <Text color={theme.dim}>  {entry.label.padEnd(LABEL_WIDTH)}</Text>
                <Text color={theme.fg}>{entry.value}</Text>
              </Box>
              {entry.detail && (
                <Box>
                  <Text color={theme.dim}>  {" ".repeat(LABEL_WIDTH)}{entry.detail}</Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

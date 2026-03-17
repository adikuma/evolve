import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface SectionDividerProps {
  label: string;
}

const RULE_WIDTH = 40;

export function SectionDivider({ label }: SectionDividerProps) {
  const upper = label.toUpperCase();
  const lineWidth = Math.max(4, RULE_WIDTH - upper.length - 1);

  return (
    <Box marginTop={1} paddingX={2}>
      <Text color={theme.dim}>{upper} </Text>
      <Text color={theme.border}>{"\u2500".repeat(lineWidth)}</Text>
    </Box>
  );
}

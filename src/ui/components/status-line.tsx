import React from "react";
import { Box, Text } from "ink";
import { theme, glyph } from "../theme.js";

interface StatusLineProps {
  parts: string[];
}

export function StatusLine({ parts }: StatusLineProps) {
  return (
    <Box paddingX={2} marginTop={1}>
      <Text color={theme.dim}>{glyph.triangle} </Text>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text color={theme.dim}> {glyph.dot} </Text>}
          <Text color={theme.dim}>{part}</Text>
        </React.Fragment>
      ))}
    </Box>
  );
}

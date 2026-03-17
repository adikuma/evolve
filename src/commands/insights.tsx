import React from "react";
import { render } from "ink";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Insights } from "../ui/components/insights.js";
import type { InsightsData } from "../ui/components/insights.js";
import { SectionDivider } from "../ui/components/section-divider.js";
import { createPatternDB } from "../db/patterns.js";
import { createRunDB } from "../db/runs.js";
import { resolvePaths } from "../utils/paths.js";

// wrapper app for insights with exit handler
function InsightsApp({ data, onExit }: { data: InsightsData; onExit: () => void }) {
  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      onExit();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      paddingY={1}
      marginX={1}
    >
      <Box paddingX={2} marginBottom={1}>
        <Text color={theme.accent} bold>evolve insights</Text>
      </Box>

      <SectionDivider label="Analytics" />
      <Box marginTop={1}>
        <Insights data={data} />
      </Box>

      <Box paddingX={2} marginTop={1}>
        <Text color={theme.muted}>press q to exit</Text>
      </Box>
    </Box>
  );
}

export async function insightsCommand(): Promise<void> {
  const paths = resolvePaths();

  const patternDB = createPatternDB(paths.evolvePatterns);
  const runDB = createRunDB(paths.evolveRuns);

  // promote any patterns that qualify
  await patternDB.promoteValidated();

  const [patterns, recentRuns, stats] = await Promise.all([
    patternDB.load(),
    runDB.recent(10),
    runDB.stats(),
  ]);

  const data: InsightsData = { stats, patterns, recentRuns };

  // clear screen
  process.stdout.write("\x1b[2J\x1b[H");

  return new Promise<void>((resolve) => {
    const instance = render(
      <InsightsApp data={data} onExit={() => {
        instance.unmount();
        resolve();
      }} />,
      { patchConsole: false },
    );
  });
}

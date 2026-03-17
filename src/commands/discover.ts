import { readFile } from "node:fs/promises";
import { glob } from "tinyglobby";
import { resolvePaths } from "../utils/paths.js";
import { loadConfig } from "../utils/config.js";
import { createLogger } from "../utils/logger.js";
import { createPatternDB } from "../db/patterns.js";
import { discoverSkills } from "../discovery/index.js";
import { toAnalyzerPattern } from "../db/types.js";
import { parseAll } from "../parser/index.js";
import { sub } from "date-fns";

export async function discoverCommand(): Promise<void> {
  const log = createLogger(true);
  const paths = resolvePaths();
  const config = await loadConfig(paths.evolveDir);

  console.log();
  console.log("  \x1b[36m\u258C\x1b[0m \x1b[1m\x1b[37mevolve discover\x1b[0m");
  console.log();

  if (!config.skillsmpApiKey) {
    log.warn("No SkillsMP API key configured. Run evolve setup to add one.");
    return;
  }

  // load existing patterns from db
  const patternDB = createPatternDB(paths.evolvePatterns);
  const patterns = await patternDB.load();

  if (patterns.length === 0) {
    // try a lightweight parse to find patterns
    log.info("No patterns in database, checking recent sessions...");

    const since = sub(new Date(), { days: 7 });
    const data = await parseAll({
      historyPath: paths.historyJsonl,
      contextLogPath: paths.contextLog,
      projectsDir: paths.projectsDir,
      since,
      deps: {
        readFile: (p: string) => readFile(p, "utf-8"),
        glob: (pattern: string) => glob([pattern]),
      },
    });

    if (data.sessions.length === 0) {
      log.info("No sessions found. Run evolve first to detect patterns.");
      return;
    }

    log.info(`Found ${data.sessions.length} sessions, but no patterns detected yet.`);
    log.info("Run evolve first to detect patterns, then use discover to find community matches.");
    return;
  }

  // convert to analyzer format for discovery
  const analyzerPatterns = patterns
    .filter((p) => p.state !== "rejected")
    .map(toAnalyzerPattern);

  log.info(`Searching SkillsMP for ${analyzerPatterns.length} patterns...`);
  console.log();

  const results = await discoverSkills(analyzerPatterns, config.skillsmpApiKey);

  if (results.length === 0) {
    log.info("No community skill matches found.");
    return;
  }

  for (const result of results) {
    const pattern = patterns.find((p) => p.id === result.patternId);
    if (!pattern) continue;

    console.log(`  \x1b[1m\x1b[37m${pattern.id}\x1b[0m`);
    console.log(`  \x1b[90m${pattern.description}\x1b[0m`);
    console.log();

    for (const match of result.matches) {
      const stars = `\u2605 ${match.stars}`;
      console.log(`    ${stars}  \x1b[36m${match.name}\x1b[0m by \x1b[90m${match.author}\x1b[0m`);
      console.log(`    \x1b[90m${match.description.slice(0, 70)}\x1b[0m`);
      if (match.githubUrl) {
        console.log(`    \x1b[90m${match.githubUrl}\x1b[0m`);
      }
      console.log();
    }
  }

  log.info(`Found ${results.length} patterns with community matches.`);
  console.log();
}

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setupCommand } from "./commands/setup.js";
import { runCommand } from "./commands/run.js";
import { statusCommand } from "./commands/status.js";
import { insightsCommand } from "./commands/insights.jsx";
import { discoverCommand } from "./commands/discover.js";
import { memoryCommand } from "./commands/memory.js";

const selfDir = dirname(fileURLToPath(import.meta.url));
let version = "0.0.0";
try {
  const pkg = JSON.parse(readFileSync(join(selfDir, "..", "package.json"), "utf-8"));
  version = pkg.version;
} catch {
  // fallback if package.json not found
}
process.env.EVOLVE_VERSION = version;

const program = new Command();

program
  .name("evolve")
  .description("self-improving developer toolkit for claude code")
  .version(version);

program
  .command("setup")
  .description("first-time setup and optional cron configuration")
  .action(async () => {
    await setupCommand();
  });

program
  .option("--auto", "autonomous mode, auto-selects highest confidence fixes")
  .option("--since <range>", "time range to analyze, e.g. 7d, 24h")
  .option("--dry-run", "show what would be built without deploying")
  .option("--verbose", "enable debug logging")
  .option("--skip-permissions", "unattended mode: deploy everything above threshold, JSON output")
  .option("--fresh", "force fresh analysis, ignore pending patterns")
  .option("--session <id>", "analyze a single session by id")
  .action(async (options: { auto?: boolean; since?: string; session?: string; dryRun?: boolean; verbose?: boolean; skipPermissions?: boolean; fresh?: boolean }) => {
    await runCommand({
      auto: options.auto,
      since: options.since,
      session: options.session,
      dryRun: options.dryRun,
      verbose: options.verbose,
      skipPermissions: options.skipPermissions,
      fresh: options.fresh,
    });
  });

program
  .command("status")
  .description("show deployed artifacts with rollback option")
  .action(async () => {
    await statusCommand();
  });

program
  .command("insights")
  .description("show analytics: patterns, deployments, run history")
  .action(async () => {
    await insightsCommand();
  });

program
  .command("discover")
  .description("search skillsmp for community skills matching your patterns")
  .action(async () => {
    await discoverCommand();
  });

program
  .command("memory")
  .description("show all patterns evolve has learned")
  .action(async () => {
    await memoryCommand();
  });

program.parse();

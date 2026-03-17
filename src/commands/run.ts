import { sub } from "date-fns";
import { resolvePaths } from "../utils/paths.js";
import { loadConfig } from "../utils/config.js";
import { executePipeline } from "../pipeline/index.js";
import { createDashboard } from "../ui/renderer.js";
import { createDashboardObserver } from "../pipeline/observers/dashboard.js";
import { createHeadlessObserver } from "../pipeline/observers/headless.js";
import type { AgentMessage } from "../analyzer/index.js";
import type { PipelineObserver } from "../pipeline/index.js";

export interface RunOptions {
  auto?: boolean;
  since?: string;
  session?: string;
  dryRun?: boolean;
  verbose?: boolean;
  skipPermissions?: boolean;
  fresh?: boolean;
}

// parse a time range string like "7d" or "30d" into a Date
// bare numbers without a unit suffix default to days
export function parseSince(sinceStr: string): Date {
  const trimmed = sinceStr.trim();

  // bare number defaults to days
  if (/^\d+$/.test(trimmed)) {
    return sub(new Date(), { days: parseInt(trimmed, 10) });
  }

  const match = trimmed.match(/^(\d+)([dhm])$/);
  if (!match) {
    throw new Error(`invalid time range: ${sinceStr}, expected format like 7d, 24h, 30m`);
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return sub(new Date(), { days: amount });
    case "h":
      return sub(new Date(), { hours: amount });
    case "m":
      return sub(new Date(), { minutes: amount });
    default:
      throw new Error(`unknown time unit: ${unit}`);
  }
}

// creates the agent query function from the claude agent sdk
function createAgentQuery(): (args: {
  prompt: string;
  options: {
    model: string;
    maxBudgetUsd: number;
    permissionMode: string;
    allowDangerouslySkipPermissions: boolean;
    allowedTools: string[];
    outputFormat?: { type: "json_schema"; schema: Record<string, unknown> };
  };
}) => AsyncIterable<AgentMessage> {
  let queryFn: ((args: { prompt: string; options: Record<string, unknown> }) => AsyncIterable<AgentMessage>) | null = null;

  return (args) => {
    const iter: AsyncIterable<AgentMessage> = {
      [Symbol.asyncIterator]() {
        return {
          started: false,
          async next() {
            if (!queryFn) {
              const sdk = await import("@anthropic-ai/claude-agent-sdk");
              queryFn = (sdk as { query: typeof queryFn }).query;
            }
            if (!this.started) {
              this.started = true;
              const actualIter = queryFn!(args);
              (this as Record<string, unknown>).innerIter = actualIter[Symbol.asyncIterator]();
            }
            const inner = (this as Record<string, unknown>).innerIter as AsyncIterator<AgentMessage>;
            return inner.next();
          },
        };
      },
    };
    return iter;
  };
}

export async function runCommand(options: RunOptions): Promise<void> {
  const projectDir = process.cwd();
  const paths = resolvePaths({ projectDir });
  const config = await loadConfig(paths.evolveDir);
  const since = parseSince(options.since || config.timeRange);
  const agentQuery = createAgentQuery();

  const pipelineOptions = {
    paths,
    config,
    since,
    auto: options.auto ?? false,
    dryRun: options.dryRun ?? false,
    fresh: options.fresh ?? false,
    session: options.session,
    mode: "interactive" as const,
    agentQuery,
  };

  // headless mode: no ui, json output
  if (options.skipPermissions) {
    const observer = createHeadlessObserver({ config, paths });
    await executePipeline(pipelineOptions, observer);
    return;
  }

  // interactive mode: full ink dashboard
  const subtitle = `sessions since ${since.toISOString().slice(0, 10)}`;
  const dashboard = createDashboard(subtitle);

  const observer = createDashboardObserver({
    dashboard,
    config,
    paths,
    auto: options.auto ?? false,
  });

  try {
    await executePipeline(pipelineOptions, observer);
    await dashboard.waitForExit();
    dashboard.unmount();
  } catch (err) {
    dashboard.unmount();
    throw err;
  }
}

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { safeParse } from "./safe-json.js";

export interface EvolveConfig {
  timeRange: string;
  maxPatternsPerRun: number;
  autoSelectThreshold: number;
  maxBudgetUsd: number;
  model: string;
  schedule: string;
  excludeProjects: string[];
  integrationMode: "manual" | "cron";
  analysisCooldownMinutes: number;
  skillsmpApiKey?: string;
}

export const DEFAULT_CONFIG: EvolveConfig = {
  timeRange: "7d",
  maxPatternsPerRun: 3,
  autoSelectThreshold: 0.8,
  maxBudgetUsd: 2.0,
  model: "sonnet",
  schedule: "0 23 * * 0",
  excludeProjects: [],
  integrationMode: "manual",
  analysisCooldownMinutes: 30,
};

// loads config from evolveDir, merges with defaults, creates file if missing
export async function loadConfig(evolveDir: string): Promise<EvolveConfig> {
  const configPath = join(evolveDir, "config.json");

  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = safeParse<Partial<EvolveConfig>>(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    // file does not exist or is invalid, create with defaults
    await mkdir(evolveDir, { recursive: true });
    await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), { encoding: "utf-8", mode: 0o600 });
    return { ...DEFAULT_CONFIG };
  }
}

// saves config to evolveDir
export async function saveConfig(evolveDir: string, config: EvolveConfig): Promise<void> {
  const configPath = join(evolveDir, "config.json");
  await mkdir(evolveDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2), { encoding: "utf-8", mode: 0o600 });
}

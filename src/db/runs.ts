import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { safeParse } from "../utils/safe-json.js";
import type { RunRecord } from "./types.js";

export interface RunDB {
  load: () => Promise<RunRecord[]>;
  append: (record: RunRecord) => Promise<void>;
  recent: (count?: number) => Promise<RunRecord[]>;
  stats: () => Promise<RunStats>;
}

export interface RunStats {
  totalRuns: number;
  totalSessionsAnalyzed: number;
  totalPatternsDetected: number;
  totalPatternsDeployed: number;
  totalPatternsRejected: number;
}

// dependency injection for file io
export interface RunDBDeps {
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  writeFile: (path: string, data: string, encoding: BufferEncoding) => Promise<void>;
  mkdir: (path: string, opts: { recursive: boolean }) => Promise<string | undefined>;
}

const defaultDeps: RunDBDeps = { readFile, writeFile, mkdir };

export function createRunDB(filePath: string, deps: RunDBDeps = defaultDeps): RunDB {
  let cache: RunRecord[] | null = null;

  async function load(): Promise<RunRecord[]> {
    if (cache) return cache;

    try {
      const raw = await deps.readFile(filePath, "utf-8");
      cache = safeParse<RunRecord[]>(raw);
      return cache;
    } catch {
      cache = [];
      return cache;
    }
  }

  async function save(records: RunRecord[]): Promise<void> {
    await deps.mkdir(dirname(filePath), { recursive: true });
    await deps.writeFile(filePath, JSON.stringify(records, null, 2), "utf-8");
    cache = records;
  }

  async function append(record: RunRecord): Promise<void> {
    const records = await load();
    records.push(record);
    await save(records);
  }

  async function recent(count = 10): Promise<RunRecord[]> {
    const records = await load();
    return records.slice(-count);
  }

  async function stats(): Promise<RunStats> {
    const records = await load();
    return {
      totalRuns: records.length,
      totalSessionsAnalyzed: records.reduce((sum, r) => sum + r.sessionsAnalyzed, 0),
      totalPatternsDetected: records.reduce((sum, r) => sum + r.patternsDetected, 0),
      totalPatternsDeployed: records.reduce((sum, r) => sum + r.patternsDeployed, 0),
      totalPatternsRejected: records.reduce((sum, r) => sum + r.patternsRejected, 0),
    };
  }

  return { load, append, recent, stats };
}

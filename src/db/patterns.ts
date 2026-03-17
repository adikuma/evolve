import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { safeParse } from "../utils/safe-json.js";
import type { StoredPattern, PatternState } from "./types.js";

export interface PatternDB {
  load: () => Promise<StoredPattern[]>;
  save: (patterns: StoredPattern[]) => Promise<void>;
  upsert: (pattern: StoredPattern) => Promise<void>;
  find: (id: string) => Promise<StoredPattern | undefined>;
  filterByState: (...states: PatternState[]) => Promise<StoredPattern[]>;
  updateState: (id: string, state: PatternState) => Promise<void>;
  markRejected: (id: string) => Promise<void>;
  promoteValidated: (daysThreshold?: number) => Promise<number>;
}

// dependency injection for file io
export interface PatternDBDeps {
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  writeFile: (path: string, data: string, encoding: BufferEncoding) => Promise<void>;
  mkdir: (path: string, opts: { recursive: boolean }) => Promise<string | undefined>;
}

const defaultDeps: PatternDBDeps = { readFile, writeFile, mkdir };

export function createPatternDB(filePath: string, deps: PatternDBDeps = defaultDeps): PatternDB {
  // in-memory cache to avoid re-reading on every call within a single run
  let cache: StoredPattern[] | null = null;

  async function load(): Promise<StoredPattern[]> {
    if (cache) return cache;

    try {
      const raw = await deps.readFile(filePath, "utf-8");
      cache = safeParse<StoredPattern[]>(raw);
      return cache;
    } catch {
      cache = [];
      return cache;
    }
  }

  async function save(patterns: StoredPattern[]): Promise<void> {
    await deps.mkdir(dirname(filePath), { recursive: true });
    await deps.writeFile(filePath, JSON.stringify(patterns, null, 2), "utf-8");
    cache = patterns;
  }

  async function upsert(pattern: StoredPattern): Promise<void> {
    const patterns = await load();
    const idx = patterns.findIndex((p) => p.id === pattern.id);
    if (idx >= 0) {
      patterns[idx] = pattern;
    } else {
      patterns.push(pattern);
    }
    await save(patterns);
  }

  async function find(id: string): Promise<StoredPattern | undefined> {
    const patterns = await load();
    return patterns.find((p) => p.id === id);
  }

  async function filterByState(...states: PatternState[]): Promise<StoredPattern[]> {
    const patterns = await load();
    return patterns.filter((p) => states.includes(p.state));
  }

  async function updateState(id: string, state: PatternState): Promise<void> {
    const patterns = await load();
    const pattern = patterns.find((p) => p.id === id);
    if (!pattern) return;

    pattern.state = state;
    const now = new Date().toISOString();

    if (state === "proposed") pattern.proposedAt = now;
    if (state === "deployed") pattern.deployedAt = now;
    if (state === "validated") pattern.validatedAt = now;
    if (state === "rejected") pattern.rejectedAt = now;

    await save(patterns);
  }

  async function markRejected(id: string): Promise<void> {
    const patterns = await load();
    const pattern = patterns.find((p) => p.id === id);
    if (!pattern) return;

    pattern.state = "rejected";
    pattern.rejectedAt = new Date().toISOString();
    pattern.metrics.rollbackCount += 1;
    await save(patterns);
  }

  // promote deployed patterns to validated after daysThreshold days without rollback
  async function promoteValidated(daysThreshold = 7): Promise<number> {
    const patterns = await load();
    const now = Date.now();
    let promoted = 0;

    for (const p of patterns) {
      if (p.state !== "deployed" || !p.deployedAt) continue;

      const deployedMs = new Date(p.deployedAt).getTime();
      const daysSince = (now - deployedMs) / (1000 * 60 * 60 * 24);

      if (daysSince >= daysThreshold && p.metrics.rollbackCount === 0) {
        p.state = "validated";
        p.validatedAt = new Date().toISOString();
        promoted++;
      }

      // always update daysSinceDeployed
      p.metrics.daysSinceDeployed = Math.floor(daysSince);
    }

    if (promoted > 0) {
      await save(patterns);
    }

    return promoted;
  }

  return { load, save, upsert, find, filterByState, updateState, markRejected, promoteValidated };
}

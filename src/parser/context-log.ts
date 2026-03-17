import type { RawContextLogEntry } from "./types.js";

export interface ContextLogFilterOptions {
  since?: Date;
  until?: Date;
}

export interface ContextLogResult {
  fileAccessCounts: Record<string, number>;
  entries: RawContextLogEntry[];
}

// parse context-log.jsonl content with optional time filters
export function parseContextLog(
  content: string,
  options: ContextLogFilterOptions = {},
): ContextLogResult {
  const { since, until } = options;

  if (!content.trim()) {
    return { fileAccessCounts: {}, entries: [] };
  }

  const lines = content.trim().split(/\r?\n/);
  const entries: RawContextLogEntry[] = [];
  const fileAccessCounts: Record<string, number> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed);

      // validate required fields
      if (!parsed.ts || !parsed.session || !parsed.tool || !parsed.file || !parsed.cwd) {
        continue;
      }

      const entry: RawContextLogEntry = {
        ts: parsed.ts,
        session: parsed.session,
        tool: parsed.tool,
        file: parsed.file,
        cwd: parsed.cwd,
      };

      // apply time filters
      const entryTime = new Date(entry.ts).getTime();
      if (since && entryTime < since.getTime()) continue;
      if (until && entryTime > until.getTime()) continue;

      entries.push(entry);
      fileAccessCounts[entry.file] = (fileAccessCounts[entry.file] || 0) + 1;
    } catch {
      continue;
    }
  }

  return { fileAccessCounts, entries };
}

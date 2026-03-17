import type { RawHistoryEntry } from "./types.js";

export interface HistoryFilterOptions {
  since?: Date;
  until?: Date;
  project?: string;
}

// parse history.jsonl content into raw entries with optional filters
export function parseHistory(
  content: string,
  options: HistoryFilterOptions = {},
): RawHistoryEntry[] {
  const { since, until, project } = options;

  if (!content.trim()) return [];

  const lines = content.trim().split(/\r?\n/);
  const entries: RawHistoryEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed);

      // skip malformed - must have required fields
      if (
        typeof parsed.display !== "string" ||
        typeof parsed.timestamp !== "number" ||
        typeof parsed.project !== "string" ||
        typeof parsed.sessionId !== "string"
      ) {
        continue;
      }

      const entry: RawHistoryEntry = {
        display: parsed.display,
        pastedContents: parsed.pastedContents ?? {},
        timestamp: parsed.timestamp,
        project: parsed.project,
        sessionId: parsed.sessionId,
      };

      // apply time filters
      if (since && entry.timestamp < since.getTime()) continue;
      if (until && entry.timestamp > until.getTime()) continue;

      // apply project filter
      if (project && entry.project !== project) continue;

      entries.push(entry);
    } catch {
      // skip lines that aren't valid json
      continue;
    }
  }

  return entries;
}

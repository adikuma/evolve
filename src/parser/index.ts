import { basename } from "node:path";
import type { ParsedData, SessionSummary } from "./types.js";
import { parseHistory } from "./history.js";
import { parseSession } from "./sessions.js";
import { parseContextLog } from "./context-log.js";

export { parseHistory } from "./history.js";
export { parseSession } from "./sessions.js";
export { parseContextLog } from "./context-log.js";
export type { HistoryFilterOptions } from "./history.js";
export type { ContextLogFilterOptions, ContextLogResult } from "./context-log.js";

export interface ParseAllOptions {
  historyPath: string;
  contextLogPath: string;
  projectsDir: string;
  since?: Date;
  until?: Date;
  project?: string;
  deps: {
    readFile: (path: string) => Promise<string>;
    glob: (pattern: string) => Promise<string[]>;
  };
}

// orchestrate all parsers: read history, dedupe sessions, glob session files, parse each, read context log
export async function parseAll(options: ParseAllOptions): Promise<ParsedData> {
  const { historyPath, contextLogPath, projectsDir, since, until, project, deps } = options;

  // read and parse history
  const historyContent = await deps.readFile(historyPath);
  const historyEntries = parseHistory(historyContent, { since, until, project });

  // dedupe session ids from history
  const uniqueSessionIds = [...new Set(historyEntries.map((e) => e.sessionId))];

  // compute time range from history entries
  let from = "";
  let to = "";
  if (historyEntries.length > 0) {
    const timestamps = historyEntries.map((e) => e.timestamp);
    from = new Date(Math.min(...timestamps)).toISOString();
    to = new Date(Math.max(...timestamps)).toISOString();
  }

  // glob for session files (normalize to forward slashes for cross-platform glob)
  const globPattern = `${projectsDir}/**/*.jsonl`.replace(/\\/g, "/");
  const sessionFiles = await deps.glob(globPattern);

  // build a lookup from session id to file path
  const sessionFileMap = new Map<string, string>();
  for (const filePath of sessionFiles) {
    // extract session id from filename using path.basename for cross-platform support
    const filename = basename(filePath);
    const sessionId = filename.replace(".jsonl", "");
    sessionFileMap.set(sessionId, filePath);
  }

  // parse each session that has a file
  const sessions: SessionSummary[] = [];
  for (const sessionId of uniqueSessionIds) {
    const filePath = sessionFileMap.get(sessionId);
    if (!filePath) continue;

    try {
      const content = await deps.readFile(filePath);
      const summary = parseSession(content, sessionId);
      // skip empty sessions with no turns
      if (summary.turnCount > 0) {
        sessions.push(summary);
      }
    } catch {
      // skip sessions we can't read
      continue;
    }
  }

  // read and parse context log
  let fileAccessCounts: Record<string, number> = {};
  try {
    const contextContent = await deps.readFile(contextLogPath);
    const contextResult = parseContextLog(contextContent, { since, until });
    fileAccessCounts = contextResult.fileAccessCounts;
  } catch {
    // context log may not exist
  }

  return {
    sessions,
    fileAccessCounts,
    timeRange: { from, to },
    totalSessions: uniqueSessionIds.length,
  };
}

// raw history.jsonl entry
export interface RawHistoryEntry {
  display: string;
  pastedContents: Record<string, { id: number; type: string; content?: string; contentHash?: string }>;
  timestamp: number; // unix milliseconds
  project: string;
  sessionId: string;
}

// raw session jsonl entry - the union of all types
export interface RawSessionEntry {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch: string;
  type: "user" | "assistant" | "progress" | "file-history-snapshot";
  uuid: string;
  timestamp: string; // iso 8601
  message?: RawMessage;
  data?: RawProgressData;
  snapshot?: RawSnapshot;
}

export interface RawMessage {
  role: "user" | "assistant";
  model?: string;
  content: string | RawContentBlock[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
  };
}

export type RawContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface RawProgressData {
  type: string;
  command?: string;
}

export interface RawSnapshot {
  messageId: string;
  trackedFileBackups: Record<string, unknown>;
  timestamp: string;
}

// raw context-log.jsonl entry
export interface RawContextLogEntry {
  ts: string; // iso 8601
  session: string;
  tool: "Read" | "Edit";
  file: string;
  cwd: string;
}

// parsed output types that evolve works with

export interface SessionSummary {
  sessionId: string;
  project: string;
  startTime: string;
  endTime: string;
  turnCount: number;
  userPrompts: string[];
  toolUseCounts: Record<string, number>;
  toolErrors: ToolError[];
  filesAccessed: string[];
  model: string;
  gitBranch: string;
}

export interface ToolError {
  tool: string;
  error: string;
  sessionId: string;
  timestamp: string;
}

export interface ParsedData {
  sessions: SessionSummary[];
  fileAccessCounts: Record<string, number>;
  timeRange: { from: string; to: string };
  totalSessions: number;
}

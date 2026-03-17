import type {
  RawSessionEntry,
  RawContentBlock,
  SessionSummary,
  ToolError,
} from "./types.js";

// parse a session jsonl file into a summary
export function parseSession(content: string, sessionId: string): SessionSummary {
  const empty: SessionSummary = {
    sessionId,
    project: "",
    startTime: "",
    endTime: "",
    turnCount: 0,
    userPrompts: [],
    toolUseCounts: {},
    toolErrors: [],
    filesAccessed: [],
    model: "",
    gitBranch: "",
  };

  if (!content.trim()) return empty;

  const lines = content.trim().split(/\r?\n/);
  const entries: RawSessionEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as RawSessionEntry);
    } catch {
      continue;
    }
  }

  if (entries.length === 0) return empty;

  // track tool_use id -> name for labeling errors
  const toolIdMap = new Map<string, string>();
  const toolUseCounts: Record<string, number> = {};
  const userPrompts: string[] = [];
  const toolErrors: ToolError[] = [];
  const filesAccessed: string[] = [];
  let turnCount = 0;
  let model = "";
  let project = "";
  let gitBranch = "";
  let startTime = "";
  let endTime = "";

  for (const entry of entries) {
    // only count user and assistant as turns
    if (entry.type === "user" || entry.type === "assistant") {
      turnCount++;
    }

    // track timestamps
    if (entry.timestamp) {
      if (!startTime || entry.timestamp < startTime) startTime = entry.timestamp;
      if (!endTime || entry.timestamp > endTime) endTime = entry.timestamp;
    }

    // grab metadata from first entry that has it
    if (entry.cwd && !project) project = entry.cwd;
    if (entry.gitBranch && !gitBranch) gitBranch = entry.gitBranch;

    if (!entry.message) continue;

    // extract model from assistant messages
    if (entry.message.model && !model) model = entry.message.model;

    const { content: msgContent, role } = entry.message;

    // extract user prompts from user messages with string content
    if (entry.type === "user" && typeof msgContent === "string") {
      userPrompts.push(msgContent);
    }

    // process content blocks (arrays)
    if (Array.isArray(msgContent)) {
      for (const block of msgContent as RawContentBlock[]) {
        if (block.type === "tool_use") {
          // track tool use
          toolIdMap.set(block.id, block.name);
          toolUseCounts[block.name] = (toolUseCounts[block.name] || 0) + 1;

          // track file access from read/edit tool inputs
          if (
            (block.name === "Read" || block.name === "Edit") &&
            typeof block.input?.file_path === "string"
          ) {
            filesAccessed.push(block.input.file_path);
          }
        }

        if (block.type === "tool_result" && block.is_error) {
          const toolName = toolIdMap.get(block.tool_use_id) || "unknown";
          toolErrors.push({
            tool: toolName,
            error: block.content,
            sessionId,
            timestamp: entry.timestamp,
          });
        }
      }
    }
  }

  return {
    sessionId,
    project,
    startTime,
    endTime,
    turnCount,
    userPrompts,
    toolUseCounts,
    toolErrors,
    filesAccessed,
    model,
    gitBranch,
  };
}

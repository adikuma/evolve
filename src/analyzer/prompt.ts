import type { ParsedData } from "../parser/types.js";
import type { StoredPattern } from "../db/types.js";
import { zodToJsonSchema } from "./zod-to-json.js";
import { AnalysisResultSchema } from "./schemas.js";
import { fillTemplate } from "../prompts/loader.js";
import solutionTypesMd from "../prompts/analyzer/solution-types.md";
import exampleMd from "../prompts/analyzer/example.md";
import instructionsMd from "../prompts/analyzer/instructions.md";

// precompute the json schema once at module load
const outputSchema = JSON.stringify(
  zodToJsonSchema(AnalysisResultSchema),
  null,
  2,
);

// truncate a string to maxLen, appending "..." if truncated
function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + "...";
}

// redact known secret patterns from text before sending to the analyzer
function scrubSecrets(text: string): string {
  return text
    .replace(/ghp_[a-zA-Z0-9]{36}/g, "[REDACTED]")
    .replace(/github_pat_[a-zA-Z0-9_]{82}/g, "[REDACTED]")
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED]")
    .replace(/Bearer\s+\S{20,}/gi, "Bearer [REDACTED]")
    .replace(/AKIA[A-Z0-9]{16}/g, "[REDACTED]");
}

// build context section for existing patterns so the analyzer avoids re-detecting them
function buildExistingPatternsContext(patterns: StoredPattern[]): string {
  const deployed = patterns.filter(
    (p) => p.state === "deployed" || p.state === "validated",
  );
  const rejected = patterns.filter((p) => p.state === "rejected");

  if (deployed.length === 0 && rejected.length === 0) return "";

  const lines: string[] = ["<existing_patterns>"];

  if (deployed.length > 0) {
    lines.push(
      "The following patterns have already been detected and deployed.",
    );
    lines.push(
      "Do NOT re-detect or re-propose these. They are already active.\n",
    );
    for (const p of deployed) {
      lines.push(`- ${p.id} [${p.state}]: "${p.solutionSummary}"`);
    }
    lines.push("");
  }

  if (rejected.length > 0) {
    lines.push(
      "The following patterns were previously detected but rejected by the user.",
    );
    lines.push("Do NOT propose these again.\n");
    for (const p of rejected) {
      lines.push(
        `- ${p.id} [rejected ${p.rejectedAt?.split("T")[0] || ""}]: "${p.solutionSummary}"`,
      );
    }
    lines.push("");
  }

  lines.push(
    "Analyze the sessions below for NEW patterns not already covered above.",
  );
  lines.push("</existing_patterns>");
  return lines.join("\n");
}

export function buildAnalysisPrompt(
  data: ParsedData,
  existingPatterns: StoredPattern[] = [],
): string {
  const sections: string[] = [];

  // existing patterns context for incremental analysis
  const existingContext = buildExistingPatternsContext(existingPatterns);
  if (existingContext) {
    sections.push(existingContext);
  }

  // session summaries
  sections.push("<session_data>");
  for (const s of data.sessions) {
    const toolUsage = Object.entries(s.toolUseCounts)
      .map(([tool, count]) => `${tool}: ${count}`)
      .join(", ");

    const prompts = s.userPrompts
      .map((p) => scrubSecrets(truncate(p, 300)))
      .join("\n  - ");

    const errors = s.toolErrors
      .map((e) => `[${e.tool}] ${truncate(e.error, 200)}`)
      .join("\n  - ");

    sections.push(
      `<session id="${s.sessionId}">
      - Project: ${s.project}
      - Branch: ${s.gitBranch}
      - Model: ${s.model}
      - Turns: ${s.turnCount}
      - Tool usage: ${toolUsage || "none"}
      - User prompts:
        - ${prompts || "none"}
      - Errors:
        - ${errors || "none"}
      </session>`,
    );
  }
  sections.push("</session_data>");

  // top 20 file access counts
  const topFiles = Object.entries(data.fileAccessCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  sections.push("<file_access>");
  for (const [file, count] of topFiles) {
    sections.push(`- ${file}: ${count} accesses`);
  }
  sections.push("</file_access>");

  // solution type reference
  sections.push(solutionTypesMd);

  // output schema
  sections.push(`<output_schema>
${outputSchema}
</output_schema>`);

  // few-shot example
  sections.push(exampleMd);

  // instructions
  sections.push(
    fillTemplate(instructionsMd, {
      sessions_analyzed: String(data.totalSessions),
      time_range_from: data.timeRange.from,
      time_range_to: data.timeRange.to,
    }),
  );

  return sections.join("\n\n");
}

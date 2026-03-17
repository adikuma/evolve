import React from "react";
import { Box, Text } from "ink";
import { theme, glyph } from "../theme.js";
import type { Pattern } from "../../analyzer/schemas.js";

interface PatternsProps {
  patterns: Pattern[];
}

// impact bar (10 chars)
function impactBar(confidence: number): { bar: string; color: string; label: string } {
  const filled = Math.round(confidence * 10);
  const empty = 10 - filled;
  const bar = glyph.filled.repeat(filled) + glyph.empty.repeat(empty);

  if (confidence >= 0.8) return { bar, color: theme.high, label: "High" };
  if (confidence >= 0.6) return { bar, color: theme.medium, label: "Medium" };
  return { bar, color: theme.low, label: "Low" };
}

// type label
function typeLabel(type: string): string {
  switch (type) {
    case "skill": return "Skill";
    case "claude_md_entry": return "CLAUDE.md";
    case "conditional_rule": return "Rule";
    case "slash_command": return "Command";
    case "subagent": return "Agent";
    default: return type;
  }
}

// wrap text to width
function wrap(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 > width) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function Patterns({ patterns }: PatternsProps) {
  return (
    <Box flexDirection="column" paddingX={2}>
      {patterns.map((p, i) => {
        const impact = impactBar(p.confidence);
        const nameWidth = Math.min(p.id.length, 36);
        const pad = Math.max(2, 38 - nameWidth);
        const cat = p.category.replace(/_/g, " ");
        const descLines = wrap(p.description, 52);

        return (
          <Box key={p.id} flexDirection="column" marginBottom={i < patterns.length - 1 ? 1 : 0}>
            {/* title + impact bar */}
            <Box>
              <Text bold color={theme.fg}>{p.id}</Text>
              <Text>{" ".repeat(pad)}</Text>
              <Text color={impact.color}>{impact.bar}</Text>
              <Text color={theme.dim}> {impact.label}</Text>
            </Box>
            {/* meta: type · category · sessions */}
            <Box>
              <Text color={theme.dim}>{typeLabel(p.solution_type)} {glyph.dot} {cat}</Text>
              {p.evidence && p.evidence.length > 0 && (
                <Text color={theme.accent}> {glyph.dot} {p.evidence.length} session{p.evidence.length > 1 ? "s" : ""}</Text>
              )}
            </Box>
            {/* description */}
            {descLines.map((line, j) => (
              <Box key={j}>
                <Text color={theme.body}>{line}</Text>
              </Box>
            ))}
            {/* evidence excerpts */}
            {p.evidence && p.evidence.length > 0 && (
              <Box flexDirection="column" marginTop={0}>
                <Text color={theme.dim}>
                  Detected across {p.evidence.length} session{p.evidence.length > 1 ? "s" : ""}:
                </Text>
                {p.evidence.slice(0, 3).map((e, k) => {
                  const date = e.timestamp
                    ? e.timestamp.slice(5, 10).replace("-", "/")
                    : "";
                  const sessionTag = e.session_id
                    ? e.session_id.slice(0, 8)
                    : "";
                  const excerpt = e.excerpt.length > 50
                    ? e.excerpt.slice(0, 47) + "..."
                    : e.excerpt;
                  return (
                    <Box key={k}>
                      <Text color={theme.muted}>  {date} </Text>
                      <Text color={theme.accent}>{sessionTag.padEnd(9)}</Text>
                      <Text color={theme.body}>"{excerpt}"</Text>
                    </Box>
                  );
                })}
                {p.evidence.length > 3 && (
                  <Text color={theme.muted}>  ...and {p.evidence.length - 3} more</Text>
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

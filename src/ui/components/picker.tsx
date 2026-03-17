import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, glyph } from "../theme.js";
import type { Pattern } from "../../analyzer/schemas.js";
import type { SelectedPattern } from "../../pipeline/index.js";

interface PickerProps {
  patterns: Pattern[];
  onSelect: (selected: SelectedPattern[] | null) => void;
}

// short label for solution type
function typeLabel(type: string): string {
  switch (type) {
    case "skill": return "skill";
    case "claude_md_entry": return "rule";
    case "conditional_rule": return "rule";
    case "slash_command": return "cmd";
    case "subagent": return "agent";
    default: return type;
  }
}

export function Picker({ patterns, onSelect }: PickerProps): React.ReactElement {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(),
  );
  const [scopes, setScopes] = useState<Map<string, "local" | "global">>(
    () => new Map(),
  );

  useInput((input, key) => {
    // navigate up
    if (key.upArrow || input === "k") {
      setCursor((prev) => (prev > 0 ? prev - 1 : patterns.length - 1));
      return;
    }

    // navigate down
    if (key.downArrow || input === "j") {
      setCursor((prev) => (prev < patterns.length - 1 ? prev + 1 : 0));
      return;
    }

    // toggle focused item
    if (input === " ") {
      const id = patterns[cursor].id;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      return;
    }

    // set focused pattern scope to global
    if (input === "g") {
      const id = patterns[cursor].id;
      setScopes((prev) => {
        const next = new Map(prev);
        next.set(id, "global");
        return next;
      });
      return;
    }

    // set focused pattern scope to local
    if (input === "l") {
      const id = patterns[cursor].id;
      setScopes((prev) => {
        const next = new Map(prev);
        next.set(id, "local");
        return next;
      });
      return;
    }

    // select all
    if (input === "a") {
      setSelected(new Set(patterns.map((p) => p.id)));
      return;
    }

    // select none
    if (input === "n") {
      setSelected(new Set());
      return;
    }

    // confirm selection
    if (key.return) {
      if (selected.size === 0) {
        onSelect(null);
      } else {
        const result: SelectedPattern[] = patterns
          .filter((p) => selected.has(p.id))
          .map((p) => ({
            pattern: p,
            scope: scopes.get(p.id) || "local",
          }));
        onSelect(result);
      }
      return;
    }
  });

  // find longest id and type for alignment
  const maxIdLen = Math.max(...patterns.map((p) => p.id.length));
  const maxTypeLen = Math.max(...patterns.map((p) => typeLabel(p.solution_type).length));

  return (
    <Box flexDirection="column" paddingX={2}>
      {patterns.map((p, i) => {
        const isFocused = i === cursor;
        const isChecked = selected.has(p.id);
        const checkChar = isChecked ? glyph.done : glyph.pending;
        const label = typeLabel(p.solution_type);
        const paddedId = p.id.padEnd(maxIdLen + 2);
        const paddedType = label.padEnd(maxTypeLen + 2);
        const confidence = p.confidence.toFixed(2);
        const scope = scopes.get(p.id) || "local";
        const scopeTag = scope === "global" ? "[G]" : "[L]";
        const scopeColor = scope === "global" ? theme.accent : theme.dim;

        return (
          <Box key={p.id}>
            {/* focus indicator */}
            <Text color={isFocused ? theme.accent : undefined}>
              {isFocused ? "\u203A " : "  "}
            </Text>
            {/* checkbox */}
            <Text
              color={isChecked ? theme.success : theme.dim}
              dimColor={!isChecked}
            >
              {checkChar}
            </Text>
            <Text> </Text>
            {/* pattern id */}
            <Text bold={isFocused} color={isFocused ? theme.fg : isChecked ? theme.body : theme.dim}>
              {paddedId}
            </Text>
            {/* type label */}
            <Text color={theme.dim}>{paddedType}</Text>
            {/* confidence */}
            <Text color={theme.dim}>{confidence}</Text>
            {/* scope indicator */}
            <Text color={scopeColor}> {scopeTag}</Text>
          </Box>
        );
      })}

      {/* footer hint */}
      <Box marginTop={1}>
        <Text color={theme.muted}>
          {"  "}enter deploy ({selected.size}) {glyph.dot} space toggle {glyph.dot} g/l scope {glyph.dot} a all {glyph.dot} n none
        </Text>
      </Box>
    </Box>
  );
}

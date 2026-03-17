import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { theme, glyph } from "../theme.js";
import { StatusLine } from "./status-line.js";
import type { StoredPattern, PatternState } from "../../db/types.js";

interface MemoryProps {
  patterns: StoredPattern[];
  onForget: (id: string) => Promise<void>;
  onForgetAll?: (ids: string[]) => Promise<void>;
  onDeploy?: (ids: string[]) => Promise<void>;
  onExit: () => void;
}

type Group = "active" | "pending" | "rejected";

interface GroupedPattern {
  pattern: StoredPattern;
  group: Group;
}

function classifyGroup(state: PatternState): Group {
  switch (state) {
    case "deployed":
    case "validated":
      return "active";
    case "detected":
    case "proposed":
      return "pending";
    case "rejected":
      return "rejected";
  }
}

function groupGlyph(group: Group): string {
  switch (group) {
    case "active": return glyph.done;
    case "pending": return glyph.pending;
    case "rejected": return glyph.failed;
  }
}

function groupColor(group: Group): string {
  switch (group) {
    case "active": return theme.success;
    case "pending": return theme.warning;
    case "rejected": return theme.error;
  }
}

function formatAge(dateStr?: string): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function relevantTimestamp(p: StoredPattern): string | undefined {
  switch (p.state) {
    case "validated": return p.validatedAt;
    case "deployed": return p.deployedAt;
    case "rejected": return p.rejectedAt;
    case "proposed": return p.proposedAt;
    case "detected": return p.detectedAt;
  }
}

function typeLabel(solutionType: string): string {
  switch (solutionType) {
    case "skill": return "skill";
    case "claude_md_entry": return "rule";
    case "conditional_rule": return "rule";
    case "slash_command": return "cmd";
    case "subagent": return "agent";
    default: return solutionType;
  }
}

function stateVerb(state: PatternState): string {
  switch (state) {
    case "validated": return "validated";
    case "deployed": return "deployed";
    case "rejected": return "rejected";
    case "proposed": return "proposed";
    case "detected": return "detected";
  }
}

function buildFlatList(patterns: StoredPattern[]): GroupedPattern[] {
  const grouped: Record<Group, StoredPattern[]> = {
    active: [],
    pending: [],
    rejected: [],
  };

  for (const p of patterns) {
    grouped[classifyGroup(p.state)].push(p);
  }

  const sortDesc = (a: StoredPattern, b: StoredPattern) =>
    b.detectedAt.localeCompare(a.detectedAt);

  for (const group of Object.values(grouped)) {
    group.sort(sortDesc);
  }

  const flat: GroupedPattern[] = [];
  for (const group of ["active", "pending", "rejected"] as const) {
    for (const pattern of grouped[group]) {
      flat.push({ pattern, group });
    }
  }

  return flat;
}

export function Memory({ patterns: initialPatterns, onForget, onForgetAll, onDeploy, onExit }: MemoryProps) {
  const [patterns, setPatterns] = useState(initialPatterns);
  const [cursor, setCursor] = useState(0);
  const [confirming, setConfirming] = useState<"forget" | "deploy" | "forget-group" | false>(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [scopes, setScopes] = useState<Map<string, "local" | "global">>(() => new Map());

  const flatList = buildFlatList(patterns);
  const totalCount = flatList.length;
  const maxNameLen = Math.max(20, ...flatList.map((g) => g.pattern.id.length + 2));

  const activeCount = flatList.filter((g) => g.group === "active").length;
  const pendingCount = flatList.filter((g) => g.group === "pending").length;
  const rejectedCount = flatList.filter((g) => g.group === "rejected").length;

  const focusedEntry = flatList[cursor];
  const focusedGroup = focusedEntry?.group;

  useInput((input, key) => {
    if (busy) return;

    if (confirming) {
      if (input === "y") {
        const target = flatList[cursor];

        if (confirming === "forget" && target) {
          setBusy(target.pattern.id);
          onForget(target.pattern.id).then(() => {
            setPatterns((prev) => prev.map((p) =>
              p.id === target.pattern.id
                ? { ...p, state: "rejected" as PatternState, rejectedAt: new Date().toISOString() }
                : p,
            ));
            setBusy(null);
          });
        }

        if (confirming === "deploy" && target && onDeploy) {
          setBusy(target.pattern.id);
          onDeploy([target.pattern.id]).then(() => {
            setPatterns((prev) => prev.map((p) =>
              p.id === target.pattern.id
                ? { ...p, state: "deployed" as PatternState, deployedAt: new Date().toISOString() }
                : p,
            ));
            setBusy(null);
          });
        }

        if (confirming === "forget-group" && focusedGroup) {
          const groupIds = flatList
            .filter((g) => g.group === focusedGroup)
            .map((g) => g.pattern.id);

          if (groupIds.length > 0) {
            setBusy("bulk");
            const forgetFn = onForgetAll || ((ids: string[]) =>
              Promise.all(ids.map((id) => onForget(id))).then(() => {}));

            forgetFn(groupIds).then(() => {
              setPatterns((prev) => prev.map((p) =>
                groupIds.includes(p.id)
                  ? { ...p, state: "rejected" as PatternState, rejectedAt: new Date().toISOString() }
                  : p,
              ));
              setCursor(0);
              setBusy(null);
            });
          }
        }

        setConfirming(false);
      } else if (input === "n" || key.escape) {
        setConfirming(false);
      }
      return;
    }

    if (input === "q" || (key.ctrl && input === "c")) {
      onExit();
      return;
    }

    if (key.upArrow || input === "k") {
      setCursor((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow || input === "j") {
      setCursor((prev) => Math.min(totalCount - 1, prev + 1));
    } else if (input === "f" && totalCount > 0) {
      setConfirming("forget");
    } else if (input === "F" && totalCount > 0 && focusedGroup && focusedGroup !== "active") {
      setConfirming("forget-group");
    } else if (input === "d" && totalCount > 0 && onDeploy) {
      const target = flatList[cursor];
      if (target && target.group === "pending") {
        setConfirming("deploy");
      }
    } else if (input === "g" && totalCount > 0) {
      const target = flatList[cursor];
      if (target && target.group === "pending") {
        setScopes((prev) => new Map(prev).set(target.pattern.id, "global"));
      }
    } else if (input === "l" && totalCount > 0) {
      const target = flatList[cursor];
      if (target && target.group === "pending") {
        setScopes((prev) => new Map(prev).set(target.pattern.id, "local"));
      }
    }
  });

  let lastGroup: Group | null = null;

  return (
    <Box flexDirection="column" paddingX={2}>
      <Box marginBottom={1}>
        <Text bold color={theme.accent}>{glyph.badge}</Text>
        <Text color={theme.dim}>  {totalCount} pattern{totalCount !== 1 ? "s" : ""} in memory</Text>
        {busy === "bulk" && (
          <Text color={theme.accent}>  <Spinner type="dots" /> working...</Text>
        )}
      </Box>

      {totalCount === 0 && (
        <Box paddingX={2}>
          <Text color={theme.muted}>no patterns detected yet</Text>
        </Box>
      )}

      {flatList.map((entry, idx) => {
        const showHeader = entry.group !== lastGroup;
        lastGroup = entry.group;
        const isSelected = idx === cursor;
        const p = entry.pattern;
        const isBusy = busy === p.id;

        const icon = groupGlyph(entry.group);
        const iconColor = groupColor(entry.group);
        const age = formatAge(relevantTimestamp(p));
        const verb = stateVerb(p.state);
        const label = typeLabel(p.solutionType);

        return (
          <React.Fragment key={p.id}>
            {showHeader && (
              <Box marginTop={idx === 0 ? 0 : 1} paddingX={2}>
                <Text color={theme.dim}>{entry.group.toUpperCase()}</Text>
              </Box>
            )}
            <Box paddingX={2}>
              {isBusy ? (
                <Text color={theme.accent}><Spinner type="dots" /> </Text>
              ) : (
                <Text color={isSelected ? theme.accent : iconColor}>{icon} </Text>
              )}
              <Text bold={isSelected} color={isSelected ? theme.fg : isBusy ? theme.accent : theme.body}>
                {p.id.padEnd(maxNameLen)}
              </Text>
              <Text color={theme.dim}>{label.padEnd(8)}</Text>
              <Text color={theme.dim}>{p.confidence.toFixed(2).padEnd(8)}</Text>
              {entry.group === "pending" && !isBusy && (
                <Text color={scopes.get(p.id) === "global" ? theme.accent : theme.dim}>
                  {scopes.get(p.id) === "global" ? "[G] " : "[L] "}
                </Text>
              )}
              {isBusy ? (
                <Text color={theme.accent}>deploying...</Text>
              ) : (
                <Text color={theme.muted}>{verb} {age}</Text>
              )}
            </Box>
            {isSelected && confirming === "forget" && (
              <Box paddingX={4}>
                <Text color={theme.warning}>forget {p.id}? (y/n)</Text>
              </Box>
            )}
            {isSelected && confirming === "deploy" && (
              <Box paddingX={4}>
                <Text color={theme.accent}>deploy {p.id}? (y/n)</Text>
              </Box>
            )}
            {isSelected && confirming === "forget-group" && showHeader && (
              <Box paddingX={4}>
                <Text color={theme.warning}>
                  forget all {flatList.filter((g) => g.group === focusedGroup).length} {focusedGroup}? (y/n)
                </Text>
              </Box>
            )}
          </React.Fragment>
        );
      })}

      {confirming === "forget-group" && (
        <Box paddingX={4} marginTop={1}>
          <Text color={theme.warning}>
            forget all {flatList.filter((g) => g.group === focusedGroup).length} {focusedGroup}? (y/n)
          </Text>
        </Box>
      )}

      <StatusLine parts={[
        `${activeCount} active`,
        `${pendingCount} pending`,
        `${rejectedCount} rejected`,
      ]} />

      <Box paddingX={2} marginTop={0}>
        <Text color={theme.muted}>d deploy {glyph.dot} g/l scope {glyph.dot} f forget {glyph.dot} F forget group {glyph.dot} q exit</Text>
      </Box>
    </Box>
  );
}

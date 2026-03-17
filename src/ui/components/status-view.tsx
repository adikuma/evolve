import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { theme, glyph } from "../theme.js";

type ArtifactType = "skill" | "claude_md_entry" | "conditional_rule" | "slash_command" | "subagent";

export interface DeployedArtifact {
  id: string;
  type: ArtifactType;
  location: string;
  state?: string;
  age?: string;
}

interface StatusViewProps {
  artifacts: DeployedArtifact[];
  onRollback: (id: string) => Promise<void>;
  onExit: () => void;
}

// display label for artifact type
function typeLabel(type: ArtifactType): string {
  switch (type) {
    case "skill": return "skill";
    case "claude_md_entry": return "rule";
    case "conditional_rule": return "rule";
    case "slash_command": return "command";
    case "subagent": return "agent";
  }
}

// rollback selection sub-view
function RollbackPicker({
  artifacts,
  onSelect,
  onCancel,
}: {
  artifacts: DeployedArtifact[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setCursor((prev) => (prev > 0 ? prev - 1 : artifacts.length - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setCursor((prev) => (prev < artifacts.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      onSelect(artifacts[cursor].id);
      return;
    }
    if (key.escape || input === "q") {
      onCancel();
      return;
    }
  });

  const maxIdLen = Math.max(...artifacts.map((a) => a.id.length));

  return (
    <Box flexDirection="column" paddingX={2}>
      <Box marginBottom={1}>
        <Text bold color={theme.fg}>select artifact to rollback</Text>
      </Box>
      {artifacts.map((a, i) => {
        const isFocused = i === cursor;
        const paddedId = a.id.padEnd(maxIdLen + 2);
        return (
          <Box key={a.id}>
            <Text color={isFocused ? theme.accent : theme.dim}>
              {isFocused ? "\u203A " : "  "}
            </Text>
            <Text bold={isFocused} color={isFocused ? theme.fg : theme.dim}>
              {paddedId}
            </Text>
            <Text color={theme.dim}>{typeLabel(a.type)}</Text>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text color={theme.muted}>{"  "}enter select {glyph.dot} escape cancel</Text>
      </Box>
    </Box>
  );
}

export function StatusView({ artifacts, onRollback, onExit }: StatusViewProps): React.ReactElement {
  const { exit } = useApp();
  const [mode, setMode] = useState<"view" | "rollback" | "rolling">("view");
  const [rollbackResult, setRollbackResult] = useState<string | null>(null);

  useInput((input, key) => {
    if (mode !== "view") return;

    if (input === "r") {
      setMode("rollback");
      return;
    }
    if (input === "q" || (key.ctrl && input === "c")) {
      onExit();
      exit();
      return;
    }
  });

  // count artifacts by state
  const deployed = artifacts.filter((a) => a.state === "deployed" || !a.state).length;
  const validated = artifacts.filter((a) => a.state === "validated").length;
  const rejected = artifacts.filter((a) => a.state === "rejected").length;

  // find max lengths for alignment
  const maxIdLen = Math.max(...artifacts.map((a) => a.id.length));
  const maxTypeLen = Math.max(...artifacts.map((a) => typeLabel(a.type).length));

  if (mode === "rollback") {
    return (
      <RollbackPicker
        artifacts={artifacts}
        onSelect={async (id) => {
          setMode("rolling");
          await onRollback(id);
          setRollbackResult(id);
          setMode("view");
        }}
        onCancel={() => setMode("view")}
      />
    );
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* header */}
      <Box marginBottom={1}>
        <Text bold color={theme.accent}>{glyph.badge}</Text>
        <Text color={theme.fg}>{"  "}{artifacts.length} active artifact{artifacts.length !== 1 ? "s" : ""}</Text>
      </Box>

      {/* artifact list */}
      <Box flexDirection="column" paddingX={2}>
        {artifacts.map((a) => {
          const isValidated = a.state === "validated";
          const stateLabel = a.state || "deployed";
          const paddedId = a.id.padEnd(maxIdLen + 2);
          const paddedType = typeLabel(a.type).padEnd(maxTypeLen + 2);
          const paddedState = stateLabel.padEnd(12);

          return (
            <Box key={a.id}>
              <Text color={isValidated ? theme.success : theme.accent}>
                {glyph.done}{" "}
              </Text>
              <Text bold color={theme.fg}>{paddedId}</Text>
              <Text color={theme.dim}>{paddedType}</Text>
              <Text color={isValidated ? theme.success : theme.body}>{paddedState}</Text>
              {a.age && <Text color={theme.dim}>{a.age}</Text>}
            </Box>
          );
        })}
      </Box>

      {/* summary counts */}
      <Box marginTop={1} paddingX={2}>
        <Text color={theme.accent}>{glyph.triangle} </Text>
        <Text color={theme.dim}>
          {deployed} deployed {glyph.dot} {validated} validated {glyph.dot} {rejected} rejected
        </Text>
      </Box>

      {/* rollback result feedback */}
      {rollbackResult && (
        <Box paddingX={2} marginTop={1}>
          <Text color={theme.success}>{glyph.done} rolled back {rollbackResult}</Text>
        </Box>
      )}

      {/* rolling spinner */}
      {mode === "rolling" && (
        <Box paddingX={2} marginTop={1}>
          <Text color={theme.accent}>{glyph.active} rolling back...</Text>
        </Box>
      )}

      {/* footer */}
      <Box marginTop={1} paddingX={2}>
        <Text color={theme.muted}>
          press r to rollback {glyph.dot} q to exit
        </Text>
      </Box>
    </Box>
  );
}

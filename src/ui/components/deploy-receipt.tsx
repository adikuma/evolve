import React from "react";
import { Box, Text } from "ink";
import { theme, glyph } from "../theme.js";

export interface DeployedItem {
  name: string;
  type: "skill" | "claude_md_entry" | "conditional_rule" | "slash_command" | "subagent";
  path: string;
  usage: string;
  action?: "created" | "appended";
  linesAdded?: number;
  scope?: "local" | "global";
}

interface DeployReceiptProps {
  items: DeployedItem[];
  backupPath: string;
  learned?: string[];
}

function typeLabel(type: DeployedItem["type"]): string {
  switch (type) {
    case "skill":            return "skill";
    case "claude_md_entry":  return "rule";
    case "conditional_rule": return "rule";
    case "slash_command":    return "command";
    case "subagent":         return "agent";
  }
}

function actionLabel(type: DeployedItem["type"]): string {
  switch (type) {
    case "skill":            return "created";
    case "claude_md_entry":  return "appended";
    case "conditional_rule": return "created";
    case "slash_command":    return "created";
    case "subagent":         return "created";
  }
}

function usagePrefix(type: DeployedItem["type"]): string {
  switch (type) {
    case "skill":            return "invoke:";
    case "claude_md_entry":  return "rule:";
    case "conditional_rule": return "rule:";
    case "slash_command":    return "invoke:";
    case "subagent":         return "agent:";
  }
}

export function DeployReceipt({ items, backupPath, learned }: DeployReceiptProps) {
  return (
    <Box flexDirection="column" paddingX={2}>
      {items.map((item, i) => {
        const action = item.action ?? actionLabel(item.type);
        const lines = item.linesAdded ?? 0;
        const scopeTag = item.scope === "global" ? "[G]" : "[L]";
        const scopeColor = item.scope === "global" ? theme.accent : theme.dim;
        return (
          <Box key={item.name} flexDirection="column" marginBottom={i < items.length - 1 ? 1 : 0}>
            <Box>
              <Text color={theme.success}>{glyph.plus} </Text>
              <Text bold color={theme.fg}>{item.name}</Text>
              <Text color={scopeColor}> {scopeTag}</Text>
              <Text color={theme.dim}> {"\u2014"} {typeLabel(item.type)}</Text>
            </Box>
            <Box>
              <Text color={theme.dim}>{"    "}{action} {lines} lines to {item.path}</Text>
            </Box>
            <Box>
              <Text color={theme.dim}>{"    "}{usagePrefix(item.type)} </Text>
              <Text color={theme.accent}>{item.usage}</Text>
            </Box>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text color={theme.dim}>  backup: {backupPath}</Text>
      </Box>
      {learned && learned.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.fg}>  WHAT I LEARNED</Text>
          {learned.map((sentence, i) => (
            <Text key={i} color={theme.body}>  learned: {sentence}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

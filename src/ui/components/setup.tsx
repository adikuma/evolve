import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { theme, glyph } from "../theme.js";
import type { EvolveConfig } from "../../utils/config.js";

type SetupStep = "model" | "timeRange" | "integrationMode" | "skillsmpAsk" | "skillsmpKey" | "done";

interface SetupProps {
  onComplete: (config: Partial<EvolveConfig>) => Promise<void>;
  onExit: () => void;
}

interface SelectOption<T extends string> {
  label: string;
  value: T;
  hint: string;
}

const MODEL_OPTIONS: SelectOption<string>[] = [
  { label: "sonnet", value: "sonnet", hint: "fast, recommended" },
  { label: "opus", value: "opus", hint: "thorough, slower" },
  { label: "haiku", value: "haiku", hint: "fastest, less accurate" },
];

const INTEGRATION_OPTIONS: SelectOption<EvolveConfig["integrationMode"]>[] = [
  { label: "manual", value: "manual", hint: "run evolve yourself when you want (recommended)" },
  { label: "cron", value: "cron", hint: "run full pipeline on a weekly schedule" },
];

// inline select component with consistent styling
function InlineSelect<T extends string>({
  options,
  onSelect,
}: {
  options: SelectOption<T>[];
  onSelect: (value: T) => void;
}): React.ReactElement {
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setCursor((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setCursor((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      onSelect(options[cursor].value);
      return;
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((opt, i) => {
        const isFocused = i === cursor;
        return (
          <Box key={opt.value}>
            <Text color={isFocused ? theme.accent : theme.dim}>
              {isFocused ? "  \u203A " : "    "}
            </Text>
            <Text bold={isFocused} color={isFocused ? theme.fg : theme.dim}>
              {opt.label}
            </Text>
            <Text color={theme.dim}> {glyph.arrow} {opt.hint}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

// inline text input using useInput
function InlineTextInput({
  placeholder,
  onSubmit,
  validate,
}: {
  placeholder: string;
  onSubmit: (value: string) => void;
  validate?: (value: string) => string | true;
}): React.ReactElement {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useInput((input, key) => {
    if (key.return) {
      const final = value || placeholder;
      if (validate) {
        const result = validate(final);
        if (result !== true) {
          setError(result);
          return;
        }
      }
      onSubmit(final);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1));
      setError("");
      return;
    }
    if (key.ctrl || key.meta || key.escape) {
      return;
    }
    if (input && !key.upArrow && !key.downArrow && !key.leftArrow && !key.rightArrow) {
      setValue((prev) => prev + input);
      setError("");
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={theme.accent}>{"  \u203A "}</Text>
        <Text color={value ? theme.fg : theme.dim}>
          {value || placeholder}
        </Text>
        <Text color={theme.accent}>_</Text>
      </Box>
      {error && (
        <Box>
          <Text color={theme.error}>{"    "}{error}</Text>
        </Box>
      )}
    </Box>
  );
}

// summary display after setup completion
function SetupSummary({
  model,
  timeRange,
  integrationMode,
  skillsmpConfigured,
  configPath,
}: {
  model: string;
  timeRange: string;
  integrationMode: string;
  skillsmpConfigured: boolean;
  configPath: string;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={theme.accent}>{glyph.badge}</Text>
        <Text color={theme.fg}>{"  setup complete"}</Text>
      </Box>

      <Box flexDirection="column" paddingX={2}>
        <Box>
          <Text color={theme.success}>{glyph.done} </Text>
          <Text color={theme.dim}>{"Model          "}{glyph.arrow} </Text>
          <Text color={theme.fg}>{model}</Text>
        </Box>
        <Box>
          <Text color={theme.success}>{glyph.done} </Text>
          <Text color={theme.dim}>{"Time range     "}{glyph.arrow} </Text>
          <Text color={theme.fg}>{timeRange}</Text>
        </Box>
        <Box>
          <Text color={theme.success}>{glyph.done} </Text>
          <Text color={theme.dim}>{"Integration    "}{glyph.arrow} </Text>
          <Text color={theme.fg}>{integrationMode}</Text>
        </Box>
        <Box>
          <Text color={skillsmpConfigured ? theme.success : theme.dim}>
            {skillsmpConfigured ? glyph.done : glyph.pending}{" "}
          </Text>
          <Text color={theme.dim}>{"SkillsMP       "}{glyph.arrow} </Text>
          <Text color={theme.fg}>{skillsmpConfigured ? "configured" : "skipped"}</Text>
        </Box>
      </Box>

      <Box marginTop={1} paddingX={2}>
        <Text color={theme.accent}>{glyph.triangle} </Text>
        <Text color={theme.dim}>config saved to {configPath}</Text>
      </Box>
    </Box>
  );
}

export function Setup({ onComplete, onExit }: SetupProps): React.ReactElement {
  const { exit } = useApp();
  const [step, setStep] = useState<SetupStep>("model");
  const [model, setModel] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [integrationMode, setIntegrationMode] = useState<EvolveConfig["integrationMode"]>("manual");
  const [skillsmpKey, setSkillsmpKey] = useState<string | undefined>();
  const [completing, setCompleting] = useState(false);

  // handle final completion
  async function handleComplete(config: Partial<EvolveConfig>): Promise<void> {
    setCompleting(true);
    await onComplete(config);
    setCompleting(false);
    setStep("done");
  }

  // handle escape to exit at any point
  useInput((input, key) => {
    if (step === "done" && (input === "q" || key.return || key.escape)) {
      onExit();
      exit();
      return;
    }
    if (key.escape && step !== "done") {
      onExit();
      exit();
    }
  });

  if (step === "done") {
    return (
      <Box flexDirection="column" paddingX={2}>
        <SetupSummary
          model={model}
          timeRange={timeRange}
          integrationMode={integrationMode}
          skillsmpConfigured={!!skillsmpKey}
          configPath="~/.evolve/config.json"
        />
        <Box marginTop={1} paddingX={2}>
          <Text color={theme.muted}>press any key to exit</Text>
        </Box>
      </Box>
    );
  }

  if (completing) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Box marginBottom={1}>
          <Text bold color={theme.accent}>{glyph.badge}</Text>
          <Text color={theme.dim}>{"  setup"}</Text>
        </Box>
        <Box paddingX={2}>
          <Text color={theme.accent}>{glyph.active} </Text>
          <Text color={theme.dim}>saving configuration...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* header */}
      <Box marginBottom={1}>
        <Text bold color={theme.accent}>{glyph.badge}</Text>
        <Text color={theme.dim}>{"  setup"}</Text>
      </Box>

      {/* model selection */}
      {step === "model" && (
        <Box flexDirection="column">
          <Box paddingX={2} marginBottom={1}>
            <Text bold color={theme.fg}>MODEL</Text>
          </Box>
          <InlineSelect
            options={MODEL_OPTIONS}
            onSelect={(value) => {
              setModel(value);
              setStep("timeRange");
            }}
          />
        </Box>
      )}

      {/* time range input */}
      {step === "timeRange" && (
        <Box flexDirection="column">
          <Box paddingX={2} marginBottom={1}>
            <Text bold color={theme.fg}>TIME RANGE</Text>
          </Box>
          <InlineTextInput
            placeholder="7d"
            onSubmit={(value) => {
              setTimeRange(value);
              setStep("integrationMode");
            }}
            validate={(value) => {
              if (/^\d+[dhm]$/.test(value.trim()) || /^\d+$/.test(value.trim())) {
                return true;
              }
              return "expected format like 7d, 24h, 30m";
            }}
          />
          <Box paddingX={2} marginTop={1}>
            <Text color={theme.muted}>e.g. 7d, 24h, 30m (enter for default)</Text>
          </Box>
        </Box>
      )}

      {/* integration mode */}
      {step === "integrationMode" && (
        <Box flexDirection="column">
          <Box paddingX={2} marginBottom={1}>
            <Text bold color={theme.fg}>INTEGRATION</Text>
          </Box>
          <InlineSelect
            options={INTEGRATION_OPTIONS}
            onSelect={(value) => {
              setIntegrationMode(value);
              setStep("skillsmpAsk");
            }}
          />
        </Box>
      )}

      {/* skillsmp confirm */}
      {step === "skillsmpAsk" && (
        <Box flexDirection="column">
          <Box paddingX={2} marginBottom={1}>
            <Text bold color={theme.fg}>SKILLSMP</Text>
          </Box>
          <Box paddingX={2}>
            <Text color={theme.body}>configure skillsmp for community skill discovery? </Text>
            <Text color={theme.dim}>(y/n)</Text>
          </Box>
          <ConfirmInput
            onConfirm={(yes) => {
              if (yes) {
                setStep("skillsmpKey");
              } else {
                handleComplete({
                  model,
                  timeRange,
                  integrationMode,
                });
              }
            }}
          />
        </Box>
      )}

      {/* skillsmp key input */}
      {step === "skillsmpKey" && (
        <Box flexDirection="column">
          <Box paddingX={2} marginBottom={1}>
            <Text bold color={theme.fg}>SKILLSMP API KEY</Text>
          </Box>
          <InlineTextInput
            placeholder=""
            onSubmit={(value) => {
              setSkillsmpKey(value);
              handleComplete({
                model,
                timeRange,
                integrationMode,
                skillsmpApiKey: value,
              });
            }}
            validate={(value) => {
              if (!value.trim()) return "api key is required";
              return true;
            }}
          />
          <Box paddingX={2} marginTop={1}>
            <Text color={theme.muted}>from skillsmp.com/settings</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// simple y/n confirm input
function ConfirmInput({
  onConfirm,
}: {
  onConfirm: (yes: boolean) => void;
}): React.ReactElement | null {
  useInput((input) => {
    if (input === "y" || input === "Y") {
      onConfirm(true);
      return;
    }
    if (input === "n" || input === "N") {
      onConfirm(false);
      return;
    }
  });

  return null;
}

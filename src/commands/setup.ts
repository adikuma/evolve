import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import React from "react";
import { render } from "ink";
import { resolvePaths } from "../utils/paths.js";
import { saveConfig, DEFAULT_CONFIG } from "../utils/config.js";
import { createLogger } from "../utils/logger.js";
import { Setup } from "../ui/components/setup.js";
import type { EvolveConfig } from "../utils/config.js";

export async function setupCommand(): Promise<void> {
  const log = createLogger(true);
  const paths = resolvePaths();

  // create evolve directories
  await mkdir(paths.evolveDir, { recursive: true });
  await mkdir(paths.evolveStaging, { recursive: true });
  await mkdir(paths.evolveBackups, { recursive: true });
  await mkdir(paths.evolveLogs, { recursive: true });

  return new Promise<void>((resolve) => {
    // clear screen for clean setup experience
    process.stdout.write("\x1b[2J\x1b[H");

    const instance = render(
      React.createElement(Setup, {
        onComplete: async (partial: Partial<EvolveConfig>) => {
          const config: EvolveConfig = { ...DEFAULT_CONFIG, ...partial };

          const needsCron = config.integrationMode === "cron" || config.integrationMode === "both";

          if (needsCron) {
            setupCron(log, config.schedule);
          }

          // validate skillsmp key if provided
          if (config.skillsmpApiKey) {
            await validateSkillsmpKey(config.skillsmpApiKey, log);
          }

          // save config
          await saveConfig(paths.evolveDir, config);
        },
        onExit: () => {
          instance.unmount();
          resolve();
        },
      }),
      { patchConsole: false },
    );
  });
}

// set up cron or windows scheduled task
function getCronCommand(): { command: string; logFile: string } {
  const h = homedir();
  const logFile = join(h, ".evolve", "logs", "cron.log");
  const entry = process.argv[1] ?? "";
  const base = entry.includes("dist") && entry.endsWith("index.js")
    ? `node "${entry}" --skip-permissions`
    : "npx --yes @adikuma/evolve --skip-permissions";

  return { command: base, logFile };
}

function cronToSchtasks(schedule: string): string {
  if (schedule.startsWith("*/")) {
    const mins = parseInt(schedule.split(" ")[0].replace("*/", ""), 10);
    return `/sc minute /mo ${mins}`;
  }
  if (schedule.includes("*/6")) return "/sc hourly /mo 6";
  if (schedule.includes("*/12")) return "/sc hourly /mo 12";
  if (schedule === "0 23 * * *") return "/sc daily /st 23:00";
  if (schedule === "0 23 * * 0") return "/sc weekly /d SUN /st 23:00";
  return "/sc weekly /d SUN /st 23:00";
}

function setupCron(log: ReturnType<typeof createLogger>, schedule: string): { installed: boolean; command: string } {
  const platform = process.platform;
  const { command, logFile } = getCronCommand();

  try {
    if (platform === "win32") {
      const schtaskFreq = cronToSchtasks(schedule);
      // on windows, create a batch file that wraps the command with logging
      const { writeFileSync } = require("node:fs") as typeof import("node:fs");
      const batPath = join(homedir(), ".evolve", "evolve-cron.bat");
      const batContent = `@echo off\r\ncd /d "${homedir()}"\r\n${command} >> "${logFile}" 2>&1\r\n`;
      writeFileSync(batPath, batContent);

      execSync(
        `schtasks /create /tn "evolve-cron" /tr "${batPath}" ${schtaskFreq} /f`,
        { stdio: "pipe" },
      );
      log.success(`cron: scheduled task created (${schedule})`);
      log.step("task name", "evolve-cron");
      log.step("runs", command);
      log.step("logs to", logFile);
      return { installed: true, command };
    } else {
      const existing = execSync("crontab -l 2>/dev/null || true", { encoding: "utf-8" });
      const cronLine = `${schedule} ${command} >> "${logFile}" 2>&1`;
      if (!existing.includes("evolve")) {
        const updated = existing.trimEnd() + "\n" + cronLine + "\n";
        execSync("crontab -", { input: updated, stdio: ["pipe", "pipe", "pipe"] });
        log.success(`cron: job added (${schedule})`);
        log.step("runs", command);
        log.step("logs to", logFile);
        return { installed: true, command };
      }
      log.info("cron: job already exists, skipping");
      return { installed: true, command };
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    if (platform === "win32") {
      log.error("cron: failed to create scheduled task");
      log.warn("this usually means you need to run as administrator");
    } else {
      log.error("cron: failed to update crontab");
    }
    log.dim(`error: ${detail.slice(0, 200)}`);
    log.info(`to set up manually, run: ${command}`);
    return { installed: false, command };
  }
}

// validate skillsmp api key with a test search
async function validateSkillsmpKey(key: string, log: ReturnType<typeof createLogger>): Promise<void> {
  try {
    const res = await fetch(
      "https://skillsmp.com/api/v1/skills/search?q=test&limit=1",
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      log.warn(`SkillsMP returned ${res.status}, key may be invalid`);
    }
  } catch {
    log.debug("could not validate skillsmp key (network error), saving anyway");
  }
}

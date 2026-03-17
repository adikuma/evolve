import React, { useState, useEffect } from "react";
import { render } from "ink";
import { App } from "./app.js";
import type { AppView } from "./app.js";
import type { Phase } from "./components/pipeline.js";
import type { BuildTask } from "./components/build-tracker.js";
import type { DeployedItem } from "./components/deploy-receipt.js";
import type { DiffEntry } from "./components/diff-view.js";
import type { SummarySection } from "./components/summary.js";
import type { Pattern } from "../analyzer/schemas.js";
import type { SelectedPattern } from "../pipeline/index.js";

// mutable state container that the imperative api writes to
interface DashboardState {
  subtitle?: string;
  phases: Phase[];
  view: AppView;
  statusParts: string[];
  interactive: boolean;
  pickerResolver?: (selected: SelectedPattern[] | null) => void;
  exitResolver?: () => void;
  listeners: Set<() => void>;
}

function createState(subtitle?: string): DashboardState {
  return {
    subtitle,
    phases: [
      { label: "Parse", status: "pending" },
      { label: "Analyze", status: "pending" },
      { label: "Select", status: "pending" },
      { label: "Deploy", status: "pending" },
    ],
    view: { type: "pipeline" },
    statusParts: [],
    interactive: !!process.stdin.isTTY,
    listeners: new Set(),
  };
}

// react component that subscribes to state changes
function DashboardBridge({ state }: { state: DashboardState }) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    state.listeners.add(listener);
    return () => { state.listeners.delete(listener); };
  }, [state]);

  const handlePickerSelect = (selected: SelectedPattern[] | null) => {
    if (state.pickerResolver) {
      state.pickerResolver(selected);
      state.pickerResolver = undefined;
    }
  };

  const handleExit = () => {
    if (state.exitResolver) {
      state.exitResolver();
      state.exitResolver = undefined;
    }
  };

  return (
    <App
      subtitle={state.subtitle}
      phases={state.phases}
      view={state.view}
      statusParts={state.statusParts.length > 0 ? state.statusParts : undefined}
      interactive={state.interactive}
      onPickerSelect={handlePickerSelect}
      onExit={handleExit}
    />
  );
}

// imperative api for pipeline commands
export interface DashboardApi {
  setPhase: (index: number, status: Phase["status"], detail?: string) => void;
  showPatterns: (patterns: Pattern[]) => void;
  showPicker: (patterns: Pattern[]) => Promise<SelectedPattern[] | null>;
  showBuild: (tasks: BuildTask[]) => void;
  updateBuild: (name: string, status: BuildTask["status"], detail?: string) => void;
  showDeployed: (items: DeployedItem[], backupPath: string, diffs: DiffEntry[]) => void;
  showLearned: (sentences: string[]) => void;
  showDryRun: (sections: SummarySection[]) => void;
  showEmpty: (message: string) => void;
  setStatus: (parts: string[]) => void;
  waitForExit: () => Promise<void>;
  unmount: () => void;
}

export function createDashboard(subtitle?: string): DashboardApi {
  const state = createState(subtitle);

  // clear screen before rendering
  process.stdout.write("\x1b[2J\x1b[H");

  const instance = render(<DashboardBridge state={state} />, {
    patchConsole: false,
    fullscreen: true,
  });

  function notify() {
    for (const listener of state.listeners) {
      listener();
    }
  }

  // mutable tasks ref for build updates
  let buildTasks: BuildTask[] = [];

  return {
    setPhase(index: number, status: Phase["status"], detail?: string) {
      if (state.phases[index]) {
        state.phases = state.phases.map((p, i) =>
          i === index ? { ...p, status, detail } : p
        );
        notify();
      }
    },

    showPatterns(patterns: Pattern[]) {
      state.view = { type: "patterns", patterns };
      notify();
    },

    showPicker(patterns: Pattern[]): Promise<SelectedPattern[] | null> {
      return new Promise((resolve) => {
        state.pickerResolver = resolve;
        state.view = { type: "picking", patterns };
        notify();
      });
    },

    showBuild(tasks: BuildTask[]) {
      buildTasks = tasks;
      state.view = { type: "building", tasks: [...buildTasks] };
      notify();
    },

    updateBuild(name: string, status: BuildTask["status"], detail?: string) {
      let task = buildTasks.find((t) => t.name === name);
      if (!task) {
        task = { name, status };
        buildTasks.push(task);
      }
      task.status = status;
      if (detail !== undefined) {
        task.detail = detail;
      }
      state.view = { type: "building", tasks: [...buildTasks] };
      notify();
    },

    showDeployed(items: DeployedItem[], backupPath: string, diffs: DiffEntry[]) {
      state.view = { type: "deployed", items, backupPath, diffs };
      notify();
    },

    showLearned(sentences: string[]) {
      // attach learned sentences to the deployed view
      if (state.view.type === "deployed") {
        state.view = { ...state.view, learned: sentences };
        notify();
      }
    },

    showDryRun(sections: SummarySection[]) {
      state.view = { type: "dry-run", sections };
      notify();
    },

    showEmpty(message: string) {
      state.view = { type: "empty", message };
      notify();
    },

    setStatus(parts: string[]) {
      state.statusParts = parts;
      notify();
    },

    // waits for user to press q (interactive) or resolves immediately (non-interactive)
    waitForExit(): Promise<void> {
      if (!state.interactive) {
        return new Promise((r) => setTimeout(r, 100));
      }
      return new Promise((resolve) => {
        state.exitResolver = resolve;
        notify();
      });
    },

    unmount() {
      instance.unmount();
    },
  };
}

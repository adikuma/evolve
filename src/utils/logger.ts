import pc from "picocolors";

export interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  success: (msg: string) => void;
  debug: (msg: string) => void;
  dim: (msg: string) => void;
  step: (label: string, value: string) => void;
  section: (title: string) => void;
}

// creates a logger instance, debug messages only shown when verbose is true
export function createLogger(verbose?: boolean): Logger {
  return {
    info: (msg: string) => console.log(`  ${pc.cyan("\u203A")} ${msg}`),
    warn: (msg: string) => console.log(`  ${pc.yellow("!")} ${pc.yellow(msg)}`),
    error: (msg: string) => console.error(`  ${pc.red("\u2717")} ${pc.red(msg)}`),
    success: (msg: string) => console.log(`  ${pc.green("\u2713")} ${pc.green(msg)}`),
    debug: (msg: string) => {
      if (verbose) {
        console.log(`    ${pc.gray(msg)}`);
      }
    },
    dim: (msg: string) => console.log(`    ${pc.gray(msg)}`),
    step: (label: string, value: string) => {
      const paddedLabel = pc.gray(label.padEnd(22));
      console.log(`    ${paddedLabel}${value}`);
    },
    section: (title: string) => {
      console.log();
      console.log(`  ${pc.gray(title.toUpperCase())}`);
    },
  };
}

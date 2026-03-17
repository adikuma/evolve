import { normalize } from "node:path";

export function normalizePath(p: string): string {
  return normalize(p).replace(/\\/g, "/").toLowerCase();
}

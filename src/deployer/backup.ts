import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

export const MAX_BACKUPS = 10;

// copies everything in claudeDir to a timestamped subdirectory of backupDir
export async function createBackup(
  claudeDir: string,
  backupDir: string,
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = join(backupDir, `backup-${timestamp}`);
  await mkdir(dest, { recursive: true });
  await cp(claudeDir, dest, { recursive: true });
  await pruneBackups(backupDir);
  return dest;
}

// removes oldest backups when count exceeds MAX_BACKUPS
export async function pruneBackups(backupDir: string): Promise<string[]> {
  try {
    const entries = await readdir(backupDir);
    const backups = entries.filter((e) => e.startsWith("backup-")).sort();
    const removed: string[] = [];

    while (backups.length > MAX_BACKUPS) {
      const oldest = backups.shift()!;
      const fullPath = join(backupDir, oldest);
      await rm(fullPath, { recursive: true, force: true });
      removed.push(oldest);
    }

    return removed;
  } catch {
    // ignore cleanup errors
    return [];
  }
}

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface InstallDeps {
  mkdir: (path: string) => Promise<void>;
  writeFile: (path: string, data: string) => Promise<void>;
  fetch: (url: string) => Promise<{ ok: boolean; text: () => Promise<string> }>;
}

const defaultDeps: InstallDeps = {
  mkdir: (p) => mkdir(p, { recursive: true }).then(() => {}),
  writeFile: (p, d) => writeFile(p, d, "utf-8"),
  fetch: (url) => fetch(url, { signal: AbortSignal.timeout(15000) }),
};

// extract raw github url for SKILL.md from a github repo url
function toRawUrl(githubUrl: string): string {
  try {
    const url = new URL(githubUrl);
    if (url.hostname !== "github.com") return "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return "";
    const user = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    if (!/^[a-zA-Z0-9_.-]+$/.test(user) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) return "";
    return `https://raw.githubusercontent.com/${user}/${repo}/main/SKILL.md`;
  } catch {
    return "";
  }
}

// install a community skill by downloading SKILL.md from github
export async function installCommunitySkill(
  name: string,
  githubUrl: string,
  skillsDir: string,
  deps: InstallDeps = defaultDeps,
): Promise<{ installed: boolean; path: string; error?: string }> {
  const rawUrl = toRawUrl(githubUrl);
  if (!rawUrl) {
    return { installed: false, path: "", error: "could not parse github url" };
  }

  try {
    const res = await deps.fetch(rawUrl);
    if (!res.ok) {
      // try alternate branch name
      const altUrl = rawUrl.replace("/main/", "/master/");
      const altRes = await deps.fetch(altUrl);
      if (!altRes.ok) {
        return { installed: false, path: "", error: "could not download SKILL.md from github" };
      }
      const content = await altRes.text();
      const skillDir = join(skillsDir, name);
      const skillPath = join(skillDir, "SKILL.md");
      await deps.mkdir(skillDir);
      await deps.writeFile(skillPath, content);
      return { installed: true, path: skillPath };
    }

    const content = await res.text();
    const skillDir = join(skillsDir, name);
    const skillPath = join(skillDir, "SKILL.md");
    await deps.mkdir(skillDir);
    await deps.writeFile(skillPath, content);
    return { installed: true, path: skillPath };
  } catch (err) {
    return { installed: false, path: "", error: String(err) };
  }
}

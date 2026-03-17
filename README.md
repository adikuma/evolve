# Evolve

I kept repeating myself to Claude. Every session, same corrections. "Use pnpm not npm." and "Conventional commits please." Over and over.

Then I started binding skills and slash commands manually to fix it. That worked, but it was sooo boring. I had to notice the pattern myself, write the fix myself, deploy it myself.

So I was like, maybe Claude can watch itself and write this stuff.


## Commands

| Command | What It Does |
|---------|-------------|
| `evolve setup` | First-time setup. Pick your model, time range, and how you want Evolve to run. |
| `evolve` | The main command. Shows detected patterns, lets you pick which to deploy. |
| `evolve --fresh` | Force a fresh analysis instead of using cached patterns. |
| `evolve --dry-run` | See what Evolve would find without deploying anything. |
| `evolve --session <id>` | Analyze just one specific session. |
| `evolve status` | See what's deployed and rollback if needed. |
| `evolve memory` | See everything Evolve has learned. Forget patterns you don't want. |
| `evolve insights` | Analytics dashboard. Runs, patterns, deployments over time. |
| `evolve discover` | Search the community for skills that match your patterns. |

## What Evolve Can Build

| Artifact | Where It Goes | What It Does |
|----------|--------------|--------------|
| **Skill** | `.claude/skills/{name}/SKILL.md` | Reusable workflow you invoke with `/skill-name` |
| **Rule** | `CLAUDE.md` | Persistent instruction Claude follows every session |
| **Conditional Rule** | `.claude/rules/{name}.md` | Rule that only applies to specific file types |
| **Slash Command** | `.claude/commands/{name}.md` | Lightweight prompt template |
| **Subagent** | `.claude/agents/{name}.md` | Specialized agent with its own personality |

For full details on how everything works, see [DOCUMENTATION.md](docs/DOCUMENTATION.md).

## Planned

- **Claude Code Hooks** — Evolve runs automatically when you start and stop Claude sessions.

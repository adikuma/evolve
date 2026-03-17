# Documentation

## Getting Started
Run `evolve setup` to configure:

- **Model**
- **Time Range**
- **Integration Mode** which could be either `manual` (run yourself) or `cron` (weekly schedule).

After setup, run `evolve` from any project directory.

## The Flow
1. **Parse** - Evolve reads your Claude Code session history from `~/.claude/`.
2. **Analyze** - Sends the session data to an LLM asking "what friction patterns do you see?"
3. **Select** - Shows you the patterns it found. You pick which ones to fix.
4. **Build** - Sends each pattern back to the LLM to generate the right artifact.
5. **Deploy** - Writes the artifact to your project's `.claude/` directory.


## Artifacts
Evolve can build five types of artifacts. The LLM decides which type fits best based on the pattern.

### Skills (`.claude/skills/{name}/SKILL.md`)
Multi-step workflows you invoke with `/skill-name`. 

### Rules (`CLAUDE.md`)
Persistent instructions Claude follows every session. 

### Conditional Rules (`.claude/rules/{name}.md`)
Rules that only apply to specific file types.

### Slash Commands (`.claude/commands/{name}.md`)
Lightweight prompt templates. Simpler than skills, just a single markdown file that loads when you type `/{name}`. 

### Subagents (`.claude/agents/{name}.md`)
Specialized agents with their own personality.

## Scope: Local vs Global
When deploying, each pattern has a scope toggle:

- **`[L]` Local** - Deploys to `{your-project}/.claude/`. Only affects that project.
- **`[G]` Global** - Deploys to `~/.claude/`. Affects every Claude Code session.

Default is local. Press `g` or `l` in the picker to toggle.

## Pattern Lifecycle
Every pattern goes through stages:

```
Detected -> Deployed -> Validated
                     -> Rejected
```

- **Detected** - Evolve found it in your sessions. Waiting for you to review.
- **Deployed** - You approved it and Evolve built the fix.
- **Validated** - The fix has been working with no rollbacks for a while.
- **Rejected** - You rolled it back or told Evolve to forget it.

Evolve remembers rejected patterns and won't suggest them again.

## Commands in Detail

### `evolve`
The main command. If there are pending patterns from previous analyses, it shows those first (skips re-analyzing). 

### `evolve --fresh`
Forces a fresh analysis even if pending patterns exist. Use this when you want to re-scan your sessions.

### `evolve --dry-run`
Shows what sessions would be analyzed and what data Evolve would see, without making any LLM calls or deploying anything.

### `evolve --session <id>`
Analyze just one specific session instead of all sessions in the time range. Session IDs are the filenames in `~/.claude/projects/`.

### `evolve --skip-permissions`
Headless mode for cron jobs. No interactive picker. Auto-selects patterns above the confidence threshold. Outputs JSON to stdout. Logs go to `~/.evolve/logs/cron.log`.

### `evolve setup`
Interactive setup wizard. Configures model, time range, integration mode, and optional SkillsMP API key. Config is saved to `~/.evolve/config.json`.

### `evolve status`
Shows all deployed Evolve artifacts in the current project. You can rollback any artifact from here.

### `evolve memory`
Shows everything Evolve has learned. All patterns grouped by state (active, pending, rejected). You can:

- **`d`** - Deploy a pending pattern directly.
- **`g`/`l`** - Toggle scope before deploying.
- **`f`** - Forget a single pattern.
- **`F`** - Forget all patterns in the current group.

### `evolve insights`
Analytics dashboard showing run history, pattern stats, and deployment counts.

### `evolve discover`
Searches the SkillsMP community marketplace for skills that match your detected patterns. Requires a SkillsMP API key (configure during setup).

## Where Things Live

### Evolve's Data (`~/.evolve/`)
Always global, shared across all projects.

```
~/.evolve/
  config.json         - your settings (model, time range, API keys)
  patterns/
    patterns.json     - all detected patterns with state and evidence
  runs/
    runs.json         - history of every evolve run
  backups/
    backup-2026-03-17T... - timestamped backups (max 10, auto-pruned)
  logs/
    cron.log          - output from cron job runs
```

### Deployed Artifacts (`{project}/.claude/`)
Per project by default.

```
{your-project}/
  .claude/
    skills/{name}/SKILL.md    - skills
    rules/{name}.md           - conditional rules
    commands/{name}.md         - slash commands
    agents/{name}.md           - subagents
  CLAUDE.md                    - rules appended here
```

### Claude Code's Data (`~/.claude/`)
Read-only. Evolve never writes here.

```
~/.claude/
  history.jsonl        - session history (read by parser)
  projects/**/*.jsonl  - session transcripts (read by parser)
```

## Cron Mode
When you pick "cron" during setup, Evolve creates a scheduled task:

- **Windows** - `schtasks` task named `evolve-weekly`, runs Sundays at 23:00.
- **macOS/Linux** - `crontab` entry with the configured schedule.

The cron job runs `evolve --skip-permissions` which auto-selects patterns above the confidence threshold and deploys them.

Check what the cron did: `cat ~/.evolve/logs/cron.log`

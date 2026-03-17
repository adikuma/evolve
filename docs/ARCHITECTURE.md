# Evolve - Architecture

## System Overview

```mermaid
flowchart TB
    subgraph CC["Claude Code"]
        session["Your Session"]
    end

    subgraph Evolve["Evolve"]
        parser["Parser"]
        analyzer["Analyzer (LLM)"]
        builder["Builder (LLM)"]
        deployer["Deployer"]
        patternDB[("patterns.json")]
        runDB[("runs.json")]
    end

    subgraph Project[".claude/ (Your Project)"]
        skills[".claude/skills/"]
        rules[".claude/rules/"]
        commands[".claude/commands/"]
        agents[".claude/agents/"]
        claudemd["CLAUDE.md"]
    end

    session -->|"evolve run"| parser
    parser --> analyzer
    analyzer --> patternDB

    patternDB --> builder
    builder --> deployer
    deployer --> Project

    style CC fill:#1a1a2e,stroke:#22d3ee,color:#fff
    style Evolve fill:#16213e,stroke:#3f3f46,color:#fff
    style Project fill:#0d1117,stroke:#4ade80,color:#fff
```

## Pipeline Flow

When you run `evolve`, the pipeline executes through an observer pattern. Three observers handle different output modes.

```mermaid
flowchart TB
    start["evolve"] --> pending{"Pending patterns\nin DB?"}

    pending -->|"Yes"| skip["Skip Parse + Analyze"]
    pending -->|"No"| parse["Parse Sessions"]
    skip --> select
    parse --> analyze["Analyze (LLM)"]
    analyze --> merge["Merge + Deduplicate"]
    merge --> select["Select (Picker)"]

    select --> build["Build Artifacts (LLM)"]
    build --> validate["Validate"]
    validate --> deploy["Deploy"]
    deploy --> record["Record Run"]

    subgraph observers["Observer Pattern"]
        dashboard["Dashboard Observer\n(Interactive Ink TUI)"]
        headless["Headless Observer\n(JSON to stdout)"]
    end

    select -.-> observers
    build -.-> observers
    deploy -.-> observers
```

## Module Structure

```mermaid
flowchart TB
    subgraph commands["src/commands/"]
        run["run.ts"]
        setup["setup.ts"]
        status["status.ts"]
        insights["insights.tsx"]
        discover["discover.ts"]
        memory["memory.tsx"]
    end

    subgraph pipeline["src/pipeline/"]
        pipelineIndex["index.ts\nexecutePipeline()"]
        dashboardObs["observers/dashboard.ts"]
        headlessObs["observers/headless.ts"]
    end

    subgraph parser["src/parser/"]
        parserIndex["index.ts\nparseAll()"]
        history["history.ts"]
        sessions["sessions.ts"]
        contextLog["context-log.ts"]
    end

    subgraph analyzerMod["src/analyzer/"]
        analyzerIndex["index.ts\nanalyze()"]
        prompt["prompt.ts"]
        schemas["schemas.ts"]
        mergeMod["merge.ts"]
        scrub["scrub.ts"]
    end

    subgraph discoveryMod["src/discovery/"]
        discoveryIndex["index.ts\ndiscoverSkills()"]
        skillsmp["skillsmp.ts"]
        install["install.ts"]
    end

    subgraph builderMod["src/builder/"]
        builderIndex["index.ts\nbuildAll()"]
        skillBuilder["skill-builder.ts"]
        claudeMdBuilder["claude-md.ts"]
        ruleBuilder["rule-builder.ts"]
        commandBuilder["command-builder.ts"]
        agentBuilder["agent-builder.ts"]
        validator["validator.ts"]
    end

    subgraph deployerMod["src/deployer/"]
        deployerIndex["index.ts\ndeploy()"]
        backup["backup.ts"]
        rollback["rollback.ts"]
    end

    subgraph db["src/db/"]
        patterns["patterns.ts"]
        runs["runs.ts"]
        types["types.ts"]
    end

    subgraph ui["src/ui/"]
        app["app.tsx"]
        renderer["renderer.tsx"]
        theme["theme.ts"]
        uiComponents["components/\npipeline, patterns, picker,\nbuild-tracker, deploy-receipt,\ndiff-view, memory, status-view,\nsetup, insights, summary"]
    end

    subgraph utils["src/utils/"]
        paths["paths.ts"]
        config["config.ts"]
        logger["logger.ts"]
        safeJson["safe-json.ts"]
        normPath["normalize-path.ts"]
    end

    run --> pipelineIndex
    pipelineIndex --> parserIndex
    pipelineIndex --> analyzerIndex
    pipelineIndex --> builderIndex
    pipelineIndex --> deployerIndex
    pipelineIndex --> db
```

## Artifact Types

```mermaid
flowchart LR
    pattern["Detected Pattern"] --> type{"Solution Type"}

    type -->|"skill"| skill["Skill\n.claude/skills/{name}/SKILL.md"]
    type -->|"claude_md_entry"| rule["Rule\nCLAUDE.md"]
    type -->|"conditional_rule"| condRule["Conditional Rule\n.claude/rules/{name}.md"]
    type -->|"slash_command"| cmd["Command\n.claude/commands/{name}.md"]
    type -->|"subagent"| agent["Agent\n.claude/agents/{name}.md"]

    skill --> scope{"Scope"}
    rule --> scope
    condRule --> scope
    cmd --> scope
    agent --> scope

    scope -->|"[L] Local"| project["{project}/.claude/"]
    scope -->|"[G] Global"| global["~/.claude/"]
```

## Pattern Lifecycle

```mermaid
stateDiagram-v2
    [*] --> detected: Evolve finds friction

    detected --> deployed: User approves + evolve builds
    detected --> rejected: User says forget it

    deployed --> validated: No rollbacks after N days
    deployed --> rejected: User rolls back

    validated --> [*]: Pattern is stable
    rejected --> [*]: Pattern is dismissed
```

## Data Storage

Evolve uses flat JSON files. No database engine required.

```mermaid
flowchart TB
    subgraph global["~/.evolve/ (Always Global)"]
        config["config.json\nmodel, timeRange, integrationMode,\nautoSelectThreshold"]
        patternsFile["patterns/patterns.json\nAll detected patterns with\nlifecycle state + evidence"]
        runsFile["runs/runs.json\nRun history with mode,\nsessions analyzed, duration"]
        backups["backups/\nTimestamped backups\n(max 10, auto-pruned)"]
        logs["logs/cron.log\nOutput from cron runs"]
    end

    subgraph project["{project}/.claude/ (Per Project)"]
        skillsDir["skills/{name}/SKILL.md"]
        rulesDir["rules/{name}.md"]
        commandsDir["commands/{name}.md"]
        agentsDir["agents/{name}.md"]
        claudeMdFile["../CLAUDE.md"]
    end

    subgraph claudeGlobal["~/.claude/ (Claude Code Global)"]
        historyFile["history.jsonl\n(Read only, never written)"]
        projectsDir["projects/**/*.jsonl\n(Session transcripts)"]
    end
```

## Deployment Flow

```mermaid
flowchart TB
    select["User selects patterns\nwith scope [L]/[G]"] --> build["Build artifacts via LLM\n(parallel per pattern)"]
    build --> validate["Validate each artifact\n(frontmatter, markers, line count)"]

    validate -->|"Pass"| backup["Create timestamped backup"]
    validate -->|"Fail"| error["Show validation errors\nin build tracker"]

    backup --> deploy["Write files to target paths"]
    deploy --> record["Update pattern DB\nstate: deployed"]
    record --> receipt["Show deploy receipt\nwith What I Learned"]

    deploy --> prune["Prune old backups\n(keep max 10)"]
```

## Security

```mermaid
flowchart TB
    subgraph input["Input Validation"]
        names["Artifact names: /^[a-z0-9-]+$/\n(prevents path traversal)"]
        paths["Transcript paths: must be under ~/.claude/\n(prevents arbitrary file reads)"]
        urls["GitHub URLs: hostname === github.com\n(prevents SSRF)"]
        ids["Marker IDs: validated before regex\n(prevents ReDoS)"]
    end

    subgraph data["Data Protection"]
        scrub["Prompts scrubbed before LLM\n(ghp_, sk-, Bearer, AKIA)"]
        perms["Config written with mode 0o600"]
        proto["JSON parsed with reviver\n(strips __proto__, constructor)"]
    end

    subgraph deploy["Deploy Safety"]
        backup["Backup before every deploy"]
        rollback["Rollback removes by marker"]
        retention["Max 10 backups retained"]
    end
```

## Integration Modes

```mermaid
flowchart LR
    setup["evolve setup"] --> mode{"Integration Mode"}

    mode -->|"Manual"| manual["Run evolve yourself\nFull control"]
    mode -->|"Cron"| cron["Weekly schedule\nFull pipeline headless"]
```

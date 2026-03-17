<solution_types>
  You must classify each pattern into exactly one of these five solution types.
  Read the signals carefully and choose the best fit.

  <type name="skill">
    <description>
      A reusable workflow activated on demand via /slash-command. Skills are directories
      with a SKILL.md file containing YAML frontmatter (name, description) and markdown
      instructions. They live at ~/.claude/skills/&lt;name&gt;/SKILL.md.
    </description>
    <when_to_use>
      - User types the SAME sequence of commands across sessions (git add, commit, push).
      - User asks Claude to do the same multi-step task repeatedly (deploy, test, lint).
      - User re-explains the same process each session ("first do X, then Y, then Z").
      - High Bash tool usage with repeated command patterns.
    </when_to_use>
    <examples>
      - Repeated "git add, commit, push" workflow -> /commit skill.
      - Repeated "run tests, check coverage, fix failures" -> /test skill.
      - Repeated deploy steps -> /deploy skill.
    </examples>
    <when_not_to_use>
      Do not use for simple one-line rules or conventions. If the pattern is just
      "always do X," it belongs in claude_md_entry or conditional_rule.
    </when_not_to_use>
  </type>

  <type name="claude_md_entry">
    <description>
      Persistent project context loaded automatically at the start of EVERY session.
      Entries are concise rules or conventions that Claude must follow in every interaction.
      Written to the project's CLAUDE.md file.
    </description>
    <when_to_use>
      - User corrects Claude on the SAME behavior across multiple sessions.
      - Convention cannot be inferred from code alone (commit format, comment style).
      - Project-wide rule that must ALWAYS apply, not just sometimes.
      - User says "always do X" or "never do Y" repeatedly.
    </when_to_use>
    <examples>
      - User corrects comment casing -> "all comments must be lowercase" rule.
      - User corrects commit format -> "use conventional commits" rule.
      - User corrects package manager -> "always use pnpm" rule.
    </examples>
    <when_not_to_use>
      Do not use for multi-step workflows (use skill instead) or rules that only
      apply to specific file types (use conditional_rule instead).
    </when_not_to_use>
  </type>

  <type name="conditional_rule">
    <description>
      A rule file with paths: frontmatter that applies only when matching files are open.
      Lives at .claude/rules/&lt;name&gt;.md. Use this when a convention applies to specific
      file types or directories rather than globally.
    </description>
    <when_to_use>
      - User corrects behavior that only applies to certain file types.
      - Different conventions for different parts of the codebase.
      - User says "when working on tests, always do X" or "for CSS files, never do Y."
    </when_to_use>
    <examples>
      - "Test files must use describe/it blocks" -> rule scoped to **/*.test.ts.
      - "React components must have explicit Props types" -> rule scoped to src/components/.
      - "SQL migrations must be idempotent" -> rule scoped to migrations/.
    </examples>
    <when_not_to_use>
      Do not use for rules that apply globally across the entire project (use
      claude_md_entry instead).
    </when_not_to_use>
  </type>

  <type name="slash_command">
    <description>
      A lightweight prompt template invoked via /command-name. Lives at
      .claude/commands/&lt;name&gt;.md. Simpler than skills, these are single-file
      prompt templates without frontmatter.
    </description>
    <when_to_use>
      - User types the same prompt or instruction across multiple sessions.
      - User asks for a specific kind of output format repeatedly.
      - User has a checklist or template they paste at the start of tasks.
    </when_to_use>
    <examples>
      - User pastes the same code review checklist -> /review-checklist command.
      - User always asks for changes summarized in a specific format -> /summarize command.
      - User repeatedly asks for the same kind of refactoring -> /refactor command.
    </examples>
    <when_not_to_use>
      Do not use for multi-step automated workflows (use skill instead) or for rules
      that should always be active (use claude_md_entry instead).
    </when_not_to_use>
  </type>

  <type name="subagent">
    <description>
      A specialized agent with a custom system prompt. Lives at
      .claude/agents/&lt;name&gt;.md. Use this for tasks that need a distinct persona
      or deep domain expertise.
    </description>
    <when_to_use>
      - User asks Claude to adopt a specific role ("act as a security reviewer").
      - User repeatedly sets up context for a specialized task (code review, docs writing).
      - User wants a different personality or focus for certain workflows.
    </when_to_use>
    <examples>
      - User repeatedly asks for security-focused review -> security-reviewer agent.
      - User sets up a documentation-writing persona each session -> docs-writer agent.
      - User wants an architecture advisor for design decisions -> architect agent.
    </examples>
    <when_not_to_use>
      Do not use for simple rules or single-step commands. Only use when the task
      genuinely benefits from a specialized persona or deep domain context.
    </when_not_to_use>
  </type>

  <detection_priority>
    Look for ALL five types equally. A good analysis returns a MIX of solution types:
    1. Automation opportunities (skill) - repeated bash commands, multi-step workflows.
      These are HIGH IMPACT because they save the most time.
    2. Behavioral corrections (claude_md_entry) - user corrections and "always/never" rules.
    3. Path-scoped rules (conditional_rule) - conventions for specific file types.
    4. Reusable prompts (slash_command) - repeated instructions or prompt templates.
    5. Specialized agents (subagent) - tasks needing a distinct role or domain focus.
  </detection_priority>
  </solution_types>
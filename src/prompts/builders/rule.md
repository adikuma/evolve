Generate a conditional rule file for Claude Code based on this pattern:

ID: {{id}}
Description: {{description}}
Category: {{category}}
Solution summary: {{solution_summary}}

Requirements:
- Conditional rules are scoped to specific file paths via YAML frontmatter.
- Include YAML frontmatter with a paths: field containing glob patterns (e.g. src/**/*.ts, tests/**).
- Wrap the entire output in evolve markers: <!-- evolve:{{id}} --> at the start and <!-- /evolve:{{id}} --> at the end.
- Keep the content concise and actionable, under 100 lines.
- The rule should clearly describe what Claude should do when editing files matching the paths.
- Output ONLY the raw markdown content, no code fences or explanations.
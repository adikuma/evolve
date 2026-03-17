Generate a slash command file for Claude Code based on this pattern:

ID: {{id}}
Description: {{description}}
Category: {{category}}
Solution summary: {{solution_summary}}

Requirements:
- Slash commands are reusable prompt templates invoked via /{{id}}.
- Optionally include YAML frontmatter with an allowed-tools: field listing tools the command can use.
- Wrap the entire output in evolve markers: <!-- evolve:{{id}} --> at the start and <!-- /evolve:{{id}} --> at the end.
- The body should be a clear prompt template that Claude follows when the user invokes the command.
- Use $ARGUMENTS as a placeholder where user input should be inserted.
- Keep the content under 300 lines.
- Output ONLY the raw markdown content, no code fences or explanations.
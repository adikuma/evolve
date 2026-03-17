Write a concise rule for a CLAUDE.md file based on this pattern:

ID: {{id}}
Description: {{description}}
Category: {{category}}
Solution summary: {{solution_summary}}

Requirements:
- Wrap the entire output in evolve markers: <!-- evolve:{{id}} --> at the start and <!-- /evolve:{{id}} --> at the end.
- Keep it brief and actionable, like a project rule.
- Output ONLY the raw markdown content, no code fences or explanations.
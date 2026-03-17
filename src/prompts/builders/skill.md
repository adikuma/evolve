Generate a SKILL.md file for a Claude Code skill based on this pattern:

ID: {{id}}
Description: {{description}}
Category: {{category}}
Solution summary: {{solution_summary}}

Requirements:
- Include YAML frontmatter with name and description fields.
- The name field in frontmatter MUST be exactly "{{id}}" (kebab-case, lowercase, no spaces).
- The description field should be a short human-readable summary.
- Include the marker comment <!-- evolve:{{id}} --> before the frontmatter.
- Include the closing marker <!-- /evolve:{{id}} --> at the end.
- Keep the total content under 500 lines.
- The skill should solve the described pattern.
- Output ONLY the raw markdown content, no code fences or explanations.
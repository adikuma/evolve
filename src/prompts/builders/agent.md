Generate a subagent definition file for Claude Code based on this pattern:

ID: {{id}}
Description: {{description}}
Category: {{category}}
Solution summary: {{solution_summary}}

Requirements:
- Subagents are specialized agents with their own personality and behavior.
- Include YAML frontmatter with name: and description: fields (required).
- The name field MUST be exactly "{{id}}" (kebab-case, lowercase, no spaces).
- Optionally include model: and tools: (array of tool names) in the frontmatter.
- Wrap the entire output in evolve markers: <!-- evolve:{{id}} --> at the start and <!-- /evolve:{{id}} --> at the end.
- The body should be a system prompt defining the agent's personality, expertise, and behavior.
- Keep the content under 200 lines.
- Output ONLY the raw markdown content, no code fences or explanations.
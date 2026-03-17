<instructions>
  Analyze the session data above and identify recurring friction patterns.

  IMPORTANT: Only report patterns you are genuinely confident about. If the session data
  does not contain clear, repeated friction, return an EMPTY patterns array. Do NOT
  fabricate or force patterns. It is perfectly valid to return zero patterns. Quality
  over quantity.

  For each pattern you identify, provide ALL of these fields:
  - id: A short kebab-case identifier.
  - description: What the user keeps doing repeatedly or struggling with.
  - category: One of workflow_automation, error_prevention, context_provision, tool_integration, convention_enforcement.
  - severity: 1-5 (how much time/effort this wastes).
  - frequency: How many times this pattern appeared across sessions.
  - affected_projects: List of project paths affected.
  - confidence: 0-1 how confident you are this is a real pattern. Only include patterns with confidence >= 0.6.
  - solution_type: One of skill, claude_md_entry, conditional_rule, slash_command, subagent. Use the solution type reference above to pick correctly.
  - solution_summary: Brief description of the proposed fix.
  - evidence: Array of {session_id, excerpt, timestamp} showing where the pattern appeared.

  Your response must contain ONLY valid JSON matching the output_schema above. No markdown, no explanation, just JSON.

  The response must include:
  - "patterns": Array of 0-5 patterns. An empty array is valid if no clear patterns exist.
  - "sessions_analyzed": {{sessions_analyzed}}
  - "time_range": { "from": "{{time_range_from}}", "to": "{{time_range_to}}" }

  Return at most 5 patterns. Focus on the most impactful, recurring issues.
  Aim for a MIX of solution types when the data supports it. Do NOT force patterns.
  </instructions>
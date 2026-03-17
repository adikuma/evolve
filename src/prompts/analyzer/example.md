<example>
{
  "patterns": [
    {
      "id": "auto-format-imports",
      "description": "User repeatedly corrects import ordering across files, preferring grouped imports with node builtins first.",
      "category": "coding_convention",
      "severity": 3,
      "frequency": 5,
      "affected_projects": ["/home/user/my-project"],
      "confidence": 0.88,
      "solution_type": "conditional_rule",
      "solution_summary": "Create a path-scoped rule for TypeScript files enforcing import grouping order.",
      "evidence": [
        { "session_id": "abc123", "excerpt": "no, imports should be grouped by type", "timestamp": "2026-03-10T14:00:00Z" }
      ]
    },
    {
      "id": "commit-workflow",
      "description": "User manually runs the same git add, commit, push sequence every session.",
      "category": "workflow_automation",
      "severity": 4,
      "frequency": 8,
      "affected_projects": ["/home/user/my-project"],
      "confidence": 0.92,
      "solution_type": "skill",
      "solution_summary": "Create a /commit skill that automates the git add, commit, push workflow.",
      "evidence": [
        { "session_id": "def456", "excerpt": "git add . && git commit -m 'fix' && git push", "timestamp": "2026-03-11T10:00:00Z" }
      ]
    }
  ],
  "sessions_analyzed": 15,
  "time_range": { "from": "2026-03-05", "to": "2026-03-12" }
}
</example>
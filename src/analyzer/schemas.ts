import { z } from "zod";

export const PatternCategorySchema = z.enum([
  "workflow_automation",
  "error_prevention",
  "context_provision",
  "tool_integration",
  "convention_enforcement",
]);

export const SolutionTypeSchema = z.enum([
  "skill",
  "claude_md_entry",
  "conditional_rule",
  "slash_command",
  "subagent",
]);

export const EvidenceSchema = z.object({
  session_id: z.string(),
  excerpt: z.string(),
  timestamp: z.string().nullable().default(""),
});

export const PatternSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string(),
  category: PatternCategorySchema,
  severity: z.number().int().min(1).max(5),
  frequency: z.number(),
  affected_projects: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  solution_type: SolutionTypeSchema,
  solution_summary: z.string(),
  evidence: z.array(EvidenceSchema),
});

export const AnalysisResultSchema = z.object({
  patterns: z.array(PatternSchema).max(5),
  sessions_analyzed: z.number(),
  time_range: z.object({
    from: z.string(),
    to: z.string(),
  }),
});

export type Pattern = z.infer<typeof PatternSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

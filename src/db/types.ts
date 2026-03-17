import type { Pattern } from "../analyzer/schemas.js";

// pattern lifecycle states
export type PatternState = "detected" | "proposed" | "deployed" | "validated" | "rejected";

// evidence entry from a user session
export interface Evidence {
  sessionId: string;
  date: string;
  excerpt: string;
  context: string;
}

// community skill match from skillsmp
export interface CommunitySkill {
  name: string;
  author: string;
  description: string;
  githubUrl: string;
  stars: number;
}

// stored pattern with full lifecycle, evidence, and metrics
export interface StoredPattern {
  id: string;
  description: string;
  category: string;
  solutionType: string;
  solutionSummary: string;

  // lifecycle
  state: PatternState;
  detectedAt: string;
  proposedAt?: string;
  deployedAt?: string;
  validatedAt?: string;
  rejectedAt?: string;

  // evidence from sessions
  evidence: Evidence[];
  confidence: number;
  sessionsAffected: number;

  // artifact content after build
  artifact?: {
    content: string;
    filePath: string;
  };

  // deployment tracking
  metrics: {
    rollbackCount: number;
    daysSinceDeployed: number;
  };

  // community matches from skillsmp
  communityMatches?: CommunitySkill[];

  // source of the deployed artifact
  source?: "custom" | "community";

  // project directory this pattern was detected in
  project?: string;
}

// record of a single evolve run
export interface RunRecord {
  id: string;
  timestamp: string;
  sessionsAnalyzed: number;
  patternsDetected: number;
  patternsDeployed: number;
  patternsRejected: number;
  durationMs: number;
  mode: "interactive" | "cron";
}

// convert an analyzer Pattern to a StoredPattern
export function fromAnalyzerPattern(pattern: Pattern, project?: string): StoredPattern {
  return {
    id: pattern.id,
    description: pattern.description,
    category: pattern.category,
    solutionType: pattern.solution_type,
    solutionSummary: pattern.solution_summary,
    state: "detected",
    detectedAt: new Date().toISOString(),
    evidence: pattern.evidence.map((e) => ({
      sessionId: e.session_id,
      date: e.timestamp || new Date().toISOString(),
      excerpt: e.excerpt,
      context: "",
    })),
    confidence: pattern.confidence,
    sessionsAffected: pattern.frequency,
    metrics: {
      rollbackCount: 0,
      daysSinceDeployed: 0,
    },
    project,
  };
}

// convert a StoredPattern back to the analyzer Pattern format for UI compatibility
export function toAnalyzerPattern(stored: StoredPattern): Pattern {
  return {
    id: stored.id,
    description: stored.description,
    category: stored.category as Pattern["category"],
    severity: 3,
    frequency: stored.sessionsAffected,
    affected_projects: [],
    confidence: stored.confidence,
    solution_type: stored.solutionType as Pattern["solution_type"],
    solution_summary: stored.solutionSummary,
    evidence: stored.evidence.map((e) => ({
      session_id: e.sessionId,
      excerpt: e.excerpt,
      timestamp: e.date,
    })),
  };
}

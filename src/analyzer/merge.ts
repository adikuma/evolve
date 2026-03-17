import type { Pattern } from "./schemas.js";
import type { StoredPattern, Evidence } from "../db/types.js";
import { fromAnalyzerPattern } from "../db/types.js";
import { distance } from "fastest-levenshtein";

// merge new llm detections with existing patterns
// returns updated patterns (merged or new) ready to be upserted into the db
export function mergePatterns(
  existing: StoredPattern[],
  detected: Pattern[],
): StoredPattern[] {
  const results: StoredPattern[] = [];

  for (const detection of detected) {
    const match = findMatch(existing, detection);

    if (match) {
      // pattern already exists, merge new evidence and update confidence
      results.push(mergeIntoExisting(match, detection));
    } else {
      // new pattern, convert to stored format
      results.push(fromAnalyzerPattern(detection));
    }
  }

  return results;
}

// find an existing pattern that matches a new detection
// uses exact id match first, then fuzzy description matching
function findMatch(
  existing: StoredPattern[],
  detection: Pattern,
): StoredPattern | undefined {
  // exact id match
  const exact = existing.find((p) => p.id === detection.id);
  if (exact) return exact;

  // fuzzy match on description (levenshtein distance < 30% of length)
  for (const p of existing) {
    const maxLen = Math.max(p.description.length, detection.description.length);
    const dist = distance(
      p.description.toLowerCase(),
      detection.description.toLowerCase(),
    );
    if (dist / maxLen < 0.3) return p;
  }

  return undefined;
}

// merge a new detection into an existing stored pattern
// accumulates evidence, updates confidence, preserves lifecycle state
function mergeIntoExisting(
  existing: StoredPattern,
  detection: Pattern,
): StoredPattern {
  // collect new evidence that doesn't already exist
  const existingSessionIds = new Set(existing.evidence.map((e) => e.sessionId));
  const newEvidence: Evidence[] = detection.evidence
    .filter((e) => !existingSessionIds.has(e.session_id))
    .map((e) => ({
      sessionId: e.session_id,
      date: e.timestamp || new Date().toISOString(),
      excerpt: e.excerpt,
      context: "",
    }));

  return {
    ...existing,
    // take the higher confidence
    confidence: Math.max(existing.confidence, detection.confidence),
    // accumulate sessions affected
    sessionsAffected: existing.sessionsAffected + detection.frequency,
    // append new evidence
    evidence: [...existing.evidence, ...newEvidence],
    // update description if new one is more detailed
    description:
      detection.description.length > existing.description.length
        ? detection.description
        : existing.description,
    solutionSummary:
      detection.solution_summary.length > existing.solutionSummary.length
        ? detection.solution_summary
        : existing.solutionSummary,
  };
}

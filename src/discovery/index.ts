import type { Pattern } from "../analyzer/schemas.js";
import type { CommunitySkill } from "../db/types.js";
import { createSkillsmpClient } from "./skillsmp.js";

export interface DiscoveryResult {
  patternId: string;
  matches: CommunitySkill[];
}

// search skillsmp for community skills matching each detected pattern
export async function discoverSkills(
  patterns: Pattern[],
  apiKey: string,
): Promise<DiscoveryResult[]> {
  const client = createSkillsmpClient(apiKey);
  const results: DiscoveryResult[] = [];

  for (const pattern of patterns) {
    const query = pattern.solution_summary || pattern.description;
    const matches = await client.aiSearch(query);

    if (matches.length > 0) {
      results.push({
        patternId: pattern.id,
        matches: matches
          .sort((a, b) => b.stars - a.stars)
          .slice(0, 3),
      });
    }
  }

  return results;
}

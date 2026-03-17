import type { CommunitySkill } from "../db/types.js";

const BASE_URL = "https://skillsmp.com/api/v1";

export interface SkillsmpClient {
  search: (query: string) => Promise<CommunitySkill[]>;
  aiSearch: (query: string) => Promise<CommunitySkill[]>;
}

interface SkillsmpResponse {
  data?: {
    skills?: Array<{
      id?: string;
      name?: string;
      author?: string;
      description?: string;
      githubUrl?: string;
      skillUrl?: string;
      stars?: number;
    }>;
  };
}

// create a skillsmp api client
export function createSkillsmpClient(apiKey: string): SkillsmpClient {
  async function request(url: string): Promise<CommunitySkill[]> {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return [];
      }

      const json = (await res.json()) as SkillsmpResponse;
      const skills = json?.data?.skills || [];

      return skills.map((s) => ({
        name: s.name || "unknown",
        author: s.author || "unknown",
        description: s.description || "",
        githubUrl: s.githubUrl || s.skillUrl || "",
        stars: s.stars || 0,
      }));
    } catch {
      return [];
    }
  }

  return {
    async search(query: string): Promise<CommunitySkill[]> {
      const encoded = encodeURIComponent(query);
      return request(`${BASE_URL}/skills/search?q=${encoded}&limit=5&sortBy=stars`);
    },

    async aiSearch(query: string): Promise<CommunitySkill[]> {
      const encoded = encodeURIComponent(query);
      return request(`${BASE_URL}/skills/ai-search?q=${encoded}`);
    },
  };
}

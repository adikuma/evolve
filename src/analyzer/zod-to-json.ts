import { zodToJsonSchema as convert } from "zod-to-json-schema";
import type { ZodType } from "zod";

export function zodToJsonSchema(schema: ZodType): Record<string, unknown> {
  return convert(schema) as Record<string, unknown>;
}

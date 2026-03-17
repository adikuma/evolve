const SECRET_PATTERNS: Array<[RegExp, string]> = [
  // github personal access tokens
  [/ghp_[A-Za-z0-9]{36}/g, "[REDACTED]"],
  // openai and similar api keys
  [/sk-[A-Za-z0-9]{20,}/g, "[REDACTED]"],
  // bearer tokens with jwt or opaque values
  [/Bearer\s+[A-Za-z0-9._-]{20,}/g, "Bearer [REDACTED]"],
  // aws access key ids
  [/AKIA[A-Z0-9]{16}/g, "[REDACTED]"],
  // generic long hex secrets (40+ chars)
  [/(?<![a-zA-Z0-9])[0-9a-f]{40,}(?![a-zA-Z0-9])/g, "[REDACTED]"],
];

export function scrubSecrets(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

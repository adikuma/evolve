export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
// matches frontmatter anywhere in content (not just at start)
const FRONTMATTER_ANYWHERE_RE = /---\n([\s\S]*?)\n---/;
const NAME_RE = /^[a-z0-9-]+$/;
const ROLLBACK_MARKER_RE = /<!-- evolve:[a-z0-9-]+ -->/;
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_LINE_COUNT = 500;

// validates a skill file content and name
export function validateSkill(content: string, name: string): ValidationResult {
  const errors: string[] = [];

  // check frontmatter exists (may appear after the evolve marker, not at line 1)
  const fmMatch = content.match(FRONTMATTER_ANYWHERE_RE);
  if (!fmMatch) {
    errors.push("missing frontmatter block (---\\n...\\n---)");
  }

  // validate name format
  if (!NAME_RE.test(name)) {
    errors.push("name must contain only lowercase letters, numbers, and hyphens");
  }

  // validate name length
  if (name.length > MAX_NAME_LENGTH) {
    errors.push(`name must be ${MAX_NAME_LENGTH} chars or fewer`);
  }

  // extract and validate description from frontmatter
  if (fmMatch) {
    const fm = fmMatch[1];
    const descMatch = fm.match(/description:\s*(.+)/);
    const desc = descMatch ? descMatch[1].trim() : "";
    if (!desc) {
      errors.push("description is required in frontmatter");
    } else if (desc.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description must be ${MAX_DESCRIPTION_LENGTH} chars or fewer`);
    }
  }

  // check rollback marker
  if (!ROLLBACK_MARKER_RE.test(content)) {
    errors.push("missing evolve rollback marker (<!-- evolve:id -->)");
  }

  // check line count
  const lineCount = content.split("\n").length;
  if (lineCount > MAX_LINE_COUNT) {
    errors.push(`skill exceeds ${MAX_LINE_COUNT} lines (has ${lineCount})`);
  }

  return { valid: errors.length === 0, errors };
}

// validates a claude.md entry has proper open/close markers
export function validateClaudeMdEntry(content: string): ValidationResult {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push("content is empty");
    return { valid: false, errors };
  }

  const hasOpening = /<!-- evolve:[a-z0-9-]+ -->/.test(content);
  const hasClosing = /<!-- \/evolve:[a-z0-9-]+ -->/.test(content);

  if (!hasOpening || !hasClosing) {
    errors.push("missing evolve marker(s) (<!-- evolve:ID --> and <!-- /evolve:ID -->)");
  }

  return { valid: errors.length === 0, errors };
}

// validates a conditional rule file content
export function validateConditionalRule(content: string): ValidationResult {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push("content is empty");
    return { valid: false, errors };
  }

  // check for both evolve markers
  const hasOpening = /<!-- evolve:[a-z0-9-]+ -->/.test(content);
  const hasClosing = /<!-- \/evolve:[a-z0-9-]+ -->/.test(content);

  if (!hasOpening || !hasClosing) {
    errors.push("missing evolve marker(s) (<!-- evolve:ID --> and <!-- /evolve:ID -->)");
  }

  // if frontmatter with paths exists, validate it has at least one glob
  const fmMatch = content.match(FRONTMATTER_ANYWHERE_RE);
  if (fmMatch) {
    const fm = fmMatch[1];
    const pathsMatch = fm.match(/paths:\s*\n([\s\S]*?)(?:\n\w|\n---|$)/);
    if (pathsMatch) {
      const pathLines = pathsMatch[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "));
      if (pathLines.length === 0) {
        errors.push("paths field in frontmatter must contain at least one glob pattern");
      }
    }
  }

  // check line count
  const lineCount = content.split("\n").length;
  if (lineCount > 100) {
    errors.push(`conditional rule exceeds 100 lines (has ${lineCount})`);
  }

  return { valid: errors.length === 0, errors };
}

// validates a slash command file content and name
export function validateSlashCommand(content: string, name: string): ValidationResult {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push("content is empty");
    return { valid: false, errors };
  }

  // validate name format (kebab case, lowercase)
  if (!NAME_RE.test(name)) {
    errors.push("name must be kebab-case (lowercase letters, numbers, and hyphens only)");
  }

  // check for both evolve markers
  const hasOpening = /<!-- evolve:[a-z0-9-]+ -->/.test(content);
  const hasClosing = /<!-- \/evolve:[a-z0-9-]+ -->/.test(content);

  if (!hasOpening || !hasClosing) {
    errors.push("missing evolve marker(s) (<!-- evolve:ID --> and <!-- /evolve:ID -->)");
  }

  // check line count
  const lineCount = content.split("\n").length;
  if (lineCount > 300) {
    errors.push(`slash command exceeds 300 lines (has ${lineCount})`);
  }

  return { valid: errors.length === 0, errors };
}

// validates a subagent file content and name
export function validateSubagent(content: string, name: string): ValidationResult {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push("content is empty");
    return { valid: false, errors };
  }

  // validate name format (kebab case, lowercase)
  if (!NAME_RE.test(name)) {
    errors.push("name must be kebab-case (lowercase letters, numbers, and hyphens only)");
  }

  // check for both evolve markers
  const hasOpening = /<!-- evolve:[a-z0-9-]+ -->/.test(content);
  const hasClosing = /<!-- \/evolve:[a-z0-9-]+ -->/.test(content);

  if (!hasOpening || !hasClosing) {
    errors.push("missing evolve marker(s) (<!-- evolve:ID --> and <!-- /evolve:ID -->)");
  }

  // check frontmatter has name and description
  const fmMatch = content.match(FRONTMATTER_ANYWHERE_RE);
  if (!fmMatch) {
    errors.push("missing frontmatter block (---\\n...\\n---)");
  } else {
    const fm = fmMatch[1];
    if (!/name:\s*.+/.test(fm)) {
      errors.push("frontmatter must include a name field");
    }
    if (!/description:\s*.+/.test(fm)) {
      errors.push("frontmatter must include a description field");
    }
  }

  // check line count
  const lineCount = content.split("\n").length;
  if (lineCount > 500) {
    errors.push(`subagent exceeds 500 lines (has ${lineCount})`);
  }

  return { valid: errors.length === 0, errors };
}

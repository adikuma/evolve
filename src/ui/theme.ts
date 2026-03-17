export const theme = {
  // text hierarchy
  fg:        "#e4e4e7",  // zinc-200 - headings, selected items, emphasis
  body:      "#a1a1aa",  // zinc-400 - descriptions, readable body text
  dim:       "#71717a",  // zinc-500 - metadata, separators, de-emphasized
  muted:     "#52525b",  // zinc-600 - disabled, lowest emphasis
  border:    "#3f3f46",  // zinc-700 - structural lines

  // accent
  accent:    "#22d3ee",  // cyan-400 - brand color, active items, links
  accentDim: "#0e7490",  // cyan-700 - subdued accent

  // status
  success:   "#4ade80",  // green-400 - done, deployed, diff additions
  warning:   "#fbbf24",  // amber-400 - medium confidence, testing
  error:     "#f87171",  // red-400 - failures

  // impact levels (aliases)
  high:      "#4ade80",
  medium:    "#fbbf24",
  low:       "#71717a",
} as const;

// hybrid/vercel style glyphs
export const glyph = {
  // status indicators
  pending: "\u25CB",   // ○ hollow circle
  active:  "\u25C9",   // ◉ fisheye
  done:    "\u25CF",   // ● filled circle
  failed:  "\u2718",   // ✘ cross mark

  // bar blocks
  filled:  "\u2588",   // █
  empty:   "\u2591",   // ░

  // brand
  badge:    "EVOLVE",
  triangle: "\u25B2",  // ▲

  // misc
  plus:    "+",
  arrow:   "\u2192",   // →
  check:   "\u2611",   // ☑
  uncheck: "\u2610",   // ☐
  dot:     "\u00B7",   // ·
} as const;

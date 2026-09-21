/**
 * Cross-process constants shared by main, preload and tools.
 */

/** Marker language of AI tool-call blocks. */
export const TOOL_BLOCK_LANG = "free";

/** Regex that matches the opening fence of a tool block, e.g. ```free */
export const TOOL_FENCE_RE = /```free\b/;

/** App / window configuration. */
export const APP = {
  name: "freecode",
} as const;

/** Timeouts (ms). */
export const TIMEOUTS = {
  jsSyncTimeout: 30_000,
  jsRunDeadline: 60_000,
  command: 30_000,
} as const;

/** Max characters returned from a single tool call. */
export const OUTPUT_LIMIT = 20_000;

/** z.ai endpoints. */
export const ZAI = {
  homeUrl: "https://chat.z.ai/",
  authUrl: "https://chat.z.ai/auth",
  host: "chat.z.ai",
} as const;

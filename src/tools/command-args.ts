/**
 * Join positional command arguments the way a shell would.
 *
 * Models sometimes call a shell tool with the program and its arguments split
 * across parameters — bash("git", "log --oneline -10") — instead of one
 * string. This helper folds those variants into a single command line while
 * leaving the common "one string" form untouched.
 *
 * Rules:
 *   bash("git log -3")                 → "git log -3"
 *   bash(["git", "log", "-3"])         → "git log -3"
 *   bash("git", "log", "-3")           → "git log -3"
 *   bash("git log -3", { workdir })    → "git log -3"   (opts untouched)
 */
export function joinCommandArgs(args: unknown[]): string {
  const parts: string[] = [];

  const push = (value: unknown): void => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) push(item);
      return;
    }
    if (typeof value === "string") {
      const text = value.trim();
      if (text) parts.push(text);
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      parts.push(String(value));
    }
  };

  // The first positional argument holds the command; a trailing options object
  // is handled separately by the tool, so stop at the first plain object.
  for (const arg of args) {
    if (arg && typeof arg === "object" && !Array.isArray(arg)) break;
    push(arg);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

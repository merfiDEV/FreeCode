/**
 * Strip artefacts that the model sometimes copies out of a `read` result and
 * pastes back into `write` / `edit`.
 *
 * A read result looks like:
 *
 *   <path>/abs/file.ts</path>
 *   <type>file</type>
 *   <content>
 *   1: const a = 1;
 *   2: const b = 2;
 *   (End of file. Total 2 lines.)
 *   </content>
 *
 * When asked to rewrite the file, the model may echo the whole envelope
 * verbatim, producing a file whose every line starts with "N:" and that is
 * wrapped in literal tags. This module detects that shape and unwraps it.
 */

/** True when the line looks like a read-result row: "12: text". */
function isNumberedLine(line: string): boolean {
  return /^\s*\d+:\s?/.test(line);
}

/** Remove the "N: " prefix from one line (tolerating aligned numbers). */
function stripLineNumber(line: string): string {
  return line.replace(/^\s*\d+:\s?/, "");
}

/**
 * Sanitize file content produced by the model.
 *
 * Returns the cleaned text; when nothing looks like an envelope artefact the
 * input is returned unchanged.
 */
export function sanitizeFileContent(raw: string): string {
  if (typeof raw !== "string" || raw.length === 0) return raw;

  // 1. Full read-result envelope: tags plus numbered lines.
  const envelope = unwrapReadEnvelope(raw);
  if (envelope !== null) return envelope;

  // 2. Numbered lines without the tags (the model kept the numbers only).
  if (looksEntirelyNumbered(raw)) return stripAllLineNumbers(raw);

  return raw;
}

/**
 * If the text is a full read result, return just its body with the line
 * numbers removed. Returns null when the text is not an envelope.
 */
function unwrapReadEnvelope(raw: string): string | null {
  const trimmed = raw.trim();

  // Must start with <path> and contain a <content> block.
  if (!/^<path>[\s\S]*?<\/path>/.test(trimmed)) return null;
  const open = trimmed.indexOf("<content>");
  const close = trimmed.lastIndexOf("</content>");
  if (open === -1 || close === -1 || close < open) return null;

  let body = trimmed.slice(open + "<content>".length, close);
  // Drop the leading newline that follows <content>.
  body = body.replace(/^\r?\n/, "");

  // Remove a trailing "(End of file...)" / "(Showing N of M lines...)" footer.
  body = body.replace(/\r?\n\s*\((End of file|Showing)[^)]*\)\s*$/, "");

  return stripAllLineNumbers(body);
}

/** True when at least 80% of non-empty lines carry a "N: " prefix. */
function looksEntirelyNumbered(text: string): boolean {
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length < 3) return false;
  const numbered = nonEmpty.filter(isNumberedLine).length;
  return numbered / nonEmpty.length >= 0.8;
}

/** Drop the "N: " prefix from every line. */
function stripAllLineNumbers(text: string): string {
  return text
    .split(/\r?\n/)
    .map(stripLineNumber)
    .join("\n");
}

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

/** "12: text" — a read-result row. */
const NUMBERED = /^\s*(\d+):\s?/;

/** Content that legitimately uses "N:" — JS labels, YAML, timestamps, URLs. */
function looksLikeRealCode(line: string): boolean {
  const t = line.trim();
  // "case 1:" / "default:" / "http://..." / "12:30" / YAML keys / JS labels.
  if (/^(case|default)\b/.test(t)) return true;
  if (/^https?:\/\//.test(t)) return true;
  if (/^\d{1,2}:\d{2}/.test(t)) return true; // timestamp 12:30
  if (/^[A-Za-z_$][\w$]*:\s*$/.test(t)) return true; // JS label
  return false;
}

/** Remove the "N: " prefix from one line (tolerating aligned numbers). */
function stripLineNumber(line: string): string {
  return line.replace(NUMBERED, "");
}

/**
 * Numbered rows form a monotonically increasing run starting at 1.
 * Checks the first few numbers so a stray "12:" in prose does not match.
 */
function isSequentialNumbering(lines: string[]): boolean {
  const numbers: number[] = [];
  for (const line of lines) {
    const m = line.match(NUMBERED);
    if (!m) continue;
    if (looksLikeRealCode(line)) return false;
    numbers.push(Number(m[1]));
    if (numbers.length >= 5) break;
  }
  if (numbers.length === 0) return false;
  if (numbers[0] !== 1) return false;
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) return false;
  }
  return true;
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
  //    Accepts even a single "1: …" line, as long as the run starts at 1.
  const lines = raw.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length > 0 && isSequentialNumbering(nonEmpty)) {
    return stripAllLineNumbers(raw);
  }

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

/** Drop the "N: " prefix from every line. */
function stripAllLineNumbers(text: string): string {
  return text
    .split(/\r?\n/)
    .map(stripLineNumber)
    .join("\n");
}

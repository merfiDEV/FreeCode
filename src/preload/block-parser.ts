/**
 * Extracts fenced tool-call blocks from an AI reply.
 *
 * The instruction prompt tells the model to answer with JavaScript inside
 * ```free blocks. We also accept a couple of common fence spellings so the
 * agent does not stall when the model improvises.
 */

const FENCE_OPEN = /^```(free|javascript|js)\s*$/i;
const FENCE_CLOSE = /^```\s*$/;

export interface ExtractedBlock {
  code: string;
}

/**
 * Split raw markdown-ish text into fenced code blocks whose language is one
 * of the accepted tool languages.
 */
export function extractToolBlocks(text: string): ExtractedBlock[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const blocks: ExtractedBlock[] = [];

  let inBlock = false;
  let buffer: string[] = [];

  for (const line of lines) {
    if (!inBlock) {
      if (FENCE_OPEN.test(line)) {
        inBlock = true;
        buffer = [];
      }
      continue;
    }
    if (FENCE_CLOSE.test(line)) {
      inBlock = false;
      const code = buffer.join("\n");
      if (code.trim()) blocks.push({ code });
      buffer = [];
      continue;
    }
    buffer.push(line);
  }

  return blocks;
}

/**
 * A block is considered complete once its closing fence has appeared.
 * Used to avoid executing a half-streamed block.
 */
export function isBlockComplete(text: string): boolean {
  const openCount = (text.match(/^```(free|javascript|js)\s*$/gim) ?? []).length;
  const closeCount = (text.match(/^```\s*$/gim) ?? []).length;
  return closeCount >= openCount && openCount > 0;
}

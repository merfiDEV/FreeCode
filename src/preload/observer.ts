import { sendMessage } from "./chat-input";
import { getProviderByUrl } from "../providers";
import { TOOL_BLOCK_LANG } from "../shared/constants";
import { ipc } from "./ipc";
import { showTask, showResult } from "./overlay";

/**
 * The agent loop.
 *
 * We watch the page for a finished assistant reply, pull the tool blocks out
 * of it via the active provider's DOM adapter, run them in the main-process
 * sandbox, and feed the combined output back as one user message.
 */

const TOOL_RESULT_HEADER = "Tool execution results:";

/**
 * Blocks already executed, keyed by a content hash.
 *
 * A WeakSet of elements is not enough: chat SPAs (Qwen, z.ai) replace message
 * nodes while streaming, so the same block ends up on a fresh element and
 * would run again. Hashing the code survives any re-render.
 */
const HANDLED_BLOCKS = new Set<string>();

let executing = false;
let started = false;
let lastUrl = "";

/** Cheap, stable hash of a code block's source. */
function blockHash(code: string): string {
  let h = 5381;
  for (let i = 0; i < code.length; i++) {
    h = ((h << 5) + h + code.charCodeAt(i)) | 0;
  }
  return h.toString(36) + ":" + code.length;
}

/** Forget every executed block when the user moves to a different chat. */
function resetHandled(): void {
  HANDLED_BLOCKS.clear();
}

async function handleReply(el: HTMLElement): Promise<boolean> {
  if (executing) return false;

  const provider = getProviderByUrl(location.href);
  if (!provider) return false;

  const all = provider.getToolBlocks(el, TOOL_BLOCK_LANG);
  if (all.length === 0) return false;

  // Drop blocks we have already run in this chat.
  const blocks = all.filter((code) => !HANDLED_BLOCKS.has(blockHash(code)));
  if (blocks.length === 0) return false;

  executing = true;
  console.log("[freecode] tool blocks found:", blocks.length);

  const digests: string[] = [];
  for (const code of blocks) {
    HANDLED_BLOCKS.add(blockHash(code));
    showTask(code);
    try {
      const res = await ipc.executeJs(code);
      const ok = res.ok;
      const text = ok ? res.digest : (res.error ?? res.digest);
      digests.push(ok ? text : "⚠ Execution error:\n" + text);
      showResult(ok, text);
    } catch (err) {
      const msg = (err as Error).message;
      digests.push("⚠ IPC error: " + msg);
      showResult(false, msg);
    }
  }

  const payload = TOOL_RESULT_HEADER + "\n\n" + digests.join("\n\n---\n\n");
  sendMessage(payload);

  // Let the SPA settle before the next cycle can start.
  setTimeout(() => {
    executing = false;
  }, 1500);
  return true;
}

/** How many consecutive "complete" scans are required before we act. */
const STABLE_SCANS = 3;
let stableCount = 0;

/**
 * Scan the DOM for finished replies with unexecuted tool blocks.
 *
 * We walk every assistant message because Qwen appends a fresh empty
 * container for the next request while the block stays in an earlier one.
 * Deduplication is by block content, so a re-rendered message is harmless.
 */
async function scan(): Promise<void> {
  const provider = getProviderByUrl(location.href);
  if (!provider) return;

  // Follow SPA navigation: moving to another chat must clear the block cache.
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    resetHandled();
  }

  if (!provider.isResponseComplete()) {
    stableCount = 0;
    return;
  }
  stableCount++;
  if (stableCount < STABLE_SCANS) return;
  stableCount = 0;

  const candidates = provider.getMessageCandidates();
  if (candidates.length === 0) return;

  for (const message of candidates) {
    if (executing) return;
    await handleReply(message);
  }
}

/** Begin watching the page. Idempotent — safe to call multiple times. */
export function startObserver(): void {
  if (started) return;
  started = true;

  const observer = new MutationObserver(() => {
    void scan();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  // Fallback poll for updates that do not fire mutations we care about.
  setInterval(() => void scan(), 1500);
}

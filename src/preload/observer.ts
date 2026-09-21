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
const HANDLED = new WeakSet<HTMLElement>();

let executing = false;
let started = false;

async function handleReply(el: HTMLElement): Promise<void> {
  if (executing) return;
  if (HANDLED.has(el)) return;

  const provider = getProviderByUrl(location.href);
  if (!provider) return;

  const blocks = provider.getToolBlocks(el, TOOL_BLOCK_LANG);
  if (blocks.length === 0) return;

  HANDLED.add(el);
  executing = true;
  console.log("[freecode] tool blocks found:", blocks.length);

  const digests: string[] = [];
  for (const code of blocks) {
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
}

/** How many consecutive "complete" scans are required before we act. */
const STABLE_SCANS = 3;
let stableCount = 0;

/** Scan the DOM once for a finished, not-yet-handled reply. */
async function scan(): Promise<void> {
  const provider = getProviderByUrl(location.href);
  if (!provider) return;

  if (!provider.isResponseComplete()) {
    stableCount = 0;
    return;
  }
  stableCount++;

  const candidates = provider.getMessageCandidates();
  if (candidates.length === 0) return;
  const last = candidates[candidates.length - 1];
  if (HANDLED.has(last)) return;
  if (stableCount < STABLE_SCANS) return;
  stableCount = 0;

  await handleReply(last);
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

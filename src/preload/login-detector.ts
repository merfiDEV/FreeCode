import { getProviderByUrl } from "../providers";
import { ipc } from "./ipc";

/**
 * Watches the active provider's session and records a successful sign-in.
 * The provider decides what "signed in" means for its own site.
 */

let marked = false;

async function check(): Promise<void> {
  if (marked) return;
  const provider = getProviderByUrl(location.href);
  if (!provider) return;
  if (!provider.isLoggedIn()) return;

  marked = true;
  try {
    await ipc.markLoggedIn();
    console.log("[freecode] sign-in confirmed for", provider.id, "- marker saved");
  } catch (err) {
    console.warn("[freecode] failed to save login marker:", (err as Error).message);
  }
}

/** Start polling for a completed sign-in. */
export function startLoginDetector(): void {
  setInterval(() => void check(), 1500);
  void check();
}

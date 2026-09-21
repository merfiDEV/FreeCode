import { exposeApi } from "./api";
import { applyStealth } from "./stealth";
import { startObserver } from "./observer";
import { injectOverlay, initI18n, getSendDelayRange } from "./overlay";
import { setSendDelayRange } from "./chat-input";
import { startLoginDetector } from "./login-detector";
import { getProviderByUrl } from "../providers";

// Mask automation markers before any page script runs.
applyStealth();

// Publish window.electronAPI for the page's main world.
exposeApi();

console.log("[freecode] preload started");

let overlayMounted = false;
let observerStarted = false;
let lastUrl = "";

/**
 * React to SPA navigation. Chat sites move between auth and chat pages without
 * a full reload, so we re-check on every URL change instead of relying on
 * boot() rerunning.
 *
 * We gate on provider.isLoggedIn() rather than on the URL: some sites use the
 * same URL for the login page and the chat (DeepSeek), so a URL comparison
 * cannot tell them apart. Once signed in, the overlay and the agent loop are
 * mounted; they stay mounted for the rest of the session.
 */
function syncWithLocation(): void {
  const url = location.href;
  const provider = getProviderByUrl(url);
  if (!provider) return;

  if (!provider.isLoggedIn()) {
    lastUrl = url;
    return;
  }

  if (!overlayMounted) {
    try {
      injectOverlay();
      overlayMounted = true;
    } catch (err) {
      console.error("[freecode] overlay error:", err);
    }
  }
  if (!observerStarted) {
    try {
      startObserver();
      observerStarted = true;
    } catch (err) {
      console.error("[freecode] observer error:", err);
    }
  }

  lastUrl = url;
}

async function boot(): Promise<void> {
  try {
    await initI18n();
  } catch (err) {
    console.error("[freecode] i18n error:", err);
  }

  try {
    const range = await getSendDelayRange();
    setSendDelayRange(range.min, range.max);
  } catch (err) {
    console.error("[freecode] delay init error:", err);
  }

  try {
    startLoginDetector();
  } catch (err) {
    console.error("[freecode] login-detector error:", err);
  }

  syncWithLocation();

  setInterval(() => {
    if (location.href !== lastUrl) syncWithLocation();
  }, 800);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
} else {
  void boot();
}

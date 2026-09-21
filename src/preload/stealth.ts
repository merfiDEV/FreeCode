/**
 * Light DOM-side stealth so the page sees a normal browser, not an automated
 * Electron shell. Runs at preload time, before page scripts execute.
 */
export function applyStealth(): void {
  try {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  } catch {
    /* ignore */
  }

  // window.chrome is present in real Chrome; provide a minimal stub.
  const w = window as unknown as { chrome?: unknown };
  if (!w.chrome) {
    w.chrome = { runtime: {} };
  }
}

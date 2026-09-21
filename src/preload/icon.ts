/**
 * Launcher icon for the collapsed overlay.
 *
 * The PNG lives in `assets/` and is inlined as a data URI so it can be used
 * inside the z.ai page (a file:// URL would be blocked by the page CSP).
 * Preload runs with sandbox disabled, so Node's fs is available here.
 */
import * as fs from "fs";
import * as path from "path";

let cached: string | null = null;

/** Data URI of the freecode launcher icon, or null if the asset is missing. */
export function iconDataUri(): string | null {
  if (cached !== null) return cached || null;
  try {
    const file = path.join(__dirname, "assets", "freecode-icon.png");
    const buf = fs.readFileSync(file);
    cached = "data:image/png;base64," + buf.toString("base64");
  } catch (err) {
    console.warn("[freecode] launcher icon not found:", (err as Error).message);
    cached = "";
  }
  return cached || null;
}

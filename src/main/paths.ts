import * as os from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * Root of all persistent freecode data.
 *
 * Defaults to <home>/freecode:
 *   Windows  C:\Users\<user>\freecode
 *   macOS    /Users/<user>/freecode
 *   Linux    /home/<user>/freecode
 *
 * Override with the FREE_CODE_HOME environment variable.
 */
export function dataRoot(): string {
  const override = process.env.FREE_CODE_HOME;
  const root = override && override.trim() ? path.resolve(override) : path.join(os.homedir(), "freecode");
  fs.mkdirSync(root, { recursive: true });
  return root;
}

/**
 * Per-provider marker file recording a successful sign-in.
 * While it is absent the app opens the provider's auth page.
 */
function loginMarkerPath(providerId: string): string {
  return path.join(dataRoot(), "." + providerId + ".logged-in");
}

export function hasLoginMarker(providerId: string): boolean {
  return fs.existsSync(loginMarkerPath(providerId));
}

export function markLoggedIn(providerId: string): void {
  try {
    fs.writeFileSync(loginMarkerPath(providerId), new Date().toISOString(), "utf-8");
  } catch (err) {
    console.error("[freecode] failed to write login marker:", (err as Error).message);
  }
}

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
 * Marker file that records a successful z.ai sign-in.
 * While it is absent the app opens the auth page instead of the chat.
 */
function loginMarkerPath(): string {
  return path.join(dataRoot(), ".logged-in");
}

export function hasLoginMarker(): boolean {
  return fs.existsSync(loginMarkerPath());
}

export function markLoggedIn(): void {
  try {
    fs.writeFileSync(loginMarkerPath(), new Date().toISOString(), "utf-8");
  } catch (err) {
    console.error("[freecode] failed to write login marker:", (err as Error).message);
  }
}

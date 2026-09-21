import * as fs from "fs";
import * as path from "path";
import { dataRoot } from "./paths";

/**
 * Persistent mapping of chat sessions to their project directories.
 *
 * The URL of a z.ai conversation looks like https://chat.z.ai/c/<sessionId>.
 * Remembering which directory was chosen for which session means the overlay
 * and the tools keep working when the user returns to an older conversation
 * (and across app restarts).
 */

function storePath(): string {
  return path.join(dataRoot(), "projects.json");
}

type Store = Record<string, string>;

function readStore(): Store {
  try {
    const raw = fs.readFileSync(storePath(), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      const out: Store = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "string" && v) out[k] = v;
      }
      return out;
    }
  } catch {
    /* missing or corrupt — start clean */
  }
  return {};
}

function writeStore(store: Store): void {
  try {
    fs.writeFileSync(storePath(), JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("[freecode] failed to write projects.json:", (err as Error).message);
  }
}

/** Directory remembered for a session, or null. */
export function getProjectDirForSession(sessionId: string | null): string | null {
  if (!sessionId) return null;
  const dir = readStore()[sessionId] ?? null;
  if (dir && !fs.existsSync(dir)) return null;
  return dir;
}

/** Remember (or clear) the directory for a session. */
export function setProjectDirForSession(sessionId: string | null, dir: string | null): void {
  if (!sessionId) return;
  const store = readStore();
  if (dir) store[sessionId] = dir;
  else delete store[sessionId];
  writeStore(store);
}

/** Extract the session id from a z.ai conversation URL. */
export function extractSessionId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/\/c\/([a-zA-Z0-9-]+)/);
  return m ? m[1] : null;
}

import * as fs from "fs";
import * as path from "path";
import { dataRoot } from "./paths";

/**
 * Persistent mapping of chat sessions to their project directories.
 *
 * Keys are namespaced as "<providerId>:<sessionId>" so that conversations on
 * different platforms never collide. Remembering which directory belongs to
 * which chat keeps the overlay and the tools working when the user returns to
 * an older conversation (and across app restarts).
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

function key(providerId: string, sessionId: string): string {
  return providerId + ":" + sessionId;
}

/** Directory remembered for a provider + session, or null. */
export function getProjectDirForSession(providerId: string, sessionId: string | null): string | null {
  if (!sessionId) return null;
  const dir = readStore()[key(providerId, sessionId)] ?? null;
  if (dir && !fs.existsSync(dir)) return null;
  return dir;
}

/** Remember (or clear) the directory for a provider + session. */
export function setProjectDirForSession(
  providerId: string,
  sessionId: string | null,
  dir: string | null,
): void {
  if (!sessionId) return;
  const store = readStore();
  const k = key(providerId, sessionId);
  if (dir) store[k] = dir;
  else delete store[k];
  writeStore(store);
}

/** Last project directory remembered for a provider (any of its sessions). */
export function getLastProjectDirForProvider(providerId: string): string | null {
  const store = readStore();
  const prefix = providerId + ":";
  let best: string | null = null;
  for (const [k, v] of Object.entries(store)) {
    if (k.startsWith(prefix) && v) best = v;
  }
  if (best && !fs.existsSync(best)) return null;
  return best;
}

import * as fs from "fs";
import * as path from "path";
import { dataRoot } from "./paths";

/**
 * Per-provider UI state for the hub: which project directory was last used
 * and when the platform was last opened.
 *
 * Kept separate from projects.json (which maps sessionId -> directory) because
 * the hub needs one summary row per platform, not per conversation.
 */

export interface ProviderState {
  /** Last project directory opened for this provider. */
  lastProjectDir: string | null;
  /** Unix ms timestamp of the last time the platform was opened. */
  lastUsedAt: number | null;
}

const EMPTY: ProviderState = { lastProjectDir: null, lastUsedAt: null };

function storePath(): string {
  return path.join(dataRoot(), "providers-state.json");
}

type Store = Record<string, ProviderState>;

function readStore(): Store {
  try {
    const raw = fs.readFileSync(storePath(), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      const out: Store = {};
      for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
        const v = value as Partial<ProviderState>;
        out[id] = {
          lastProjectDir: typeof v.lastProjectDir === "string" ? v.lastProjectDir : null,
          lastUsedAt: typeof v.lastUsedAt === "number" ? v.lastUsedAt : null,
        };
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
    console.error("[freecode] failed to write providers-state.json:", (err as Error).message);
  }
}

export function getProviderState(id: string): ProviderState {
  return readStore()[id] ?? { ...EMPTY };
}

export function getAllProviderStates(): Store {
  return readStore();
}

/** Merge and persist a partial state update for one provider. */
export function touchProvider(id: string, patch: Partial<ProviderState>): ProviderState {
  const store = readStore();
  const current = store[id] ?? { ...EMPTY };
  const next: ProviderState = { ...current, ...patch };
  store[id] = next;
  writeStore(store);
  return next;
}

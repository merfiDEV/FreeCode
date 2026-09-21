import * as fs from "fs";
import * as path from "path";
import { dataRoot } from "./paths";

/**
 * User settings persisted as JSON in the data folder.
 */
export interface Settings {
  /** Lower bound of the random send delay, in seconds. */
  sendDelayMin: number;
  /** Upper bound of the random send delay, in seconds. */
  sendDelayMax: number;
  /** UI language: "en" or "ru". */
  language: "en" | "ru";
}

const DEFAULTS: Settings = {
  sendDelayMin: 2,
  sendDelayMax: 5.9,
  language: "en",
};

function settingsPath(): string {
  return path.join(dataRoot(), "settings.json");
}

/** Read settings, falling back to defaults for missing/invalid values. */
export function readSettings(): Settings {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      sendDelayMin: clamp(parsed.sendDelayMin, 0, 120, DEFAULTS.sendDelayMin),
      sendDelayMax: clamp(parsed.sendDelayMax, 0, 120, DEFAULTS.sendDelayMax),
      language: parsed.language === "ru" ? "ru" : "en",
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Merge and persist a partial settings update. */
export function writeSettings(patch: Partial<Settings>): Settings {
  const next = { ...readSettings(), ...patch };
  next.sendDelayMin = clamp(next.sendDelayMin, 0, 120, DEFAULTS.sendDelayMin);
  next.sendDelayMax = clamp(next.sendDelayMax, 0, 120, DEFAULTS.sendDelayMax);
  if (next.sendDelayMax < next.sendDelayMin) next.sendDelayMax = next.sendDelayMin;
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf-8");
  } catch (err) {
    console.error("[freecode] failed to write settings:", (err as Error).message);
  }
  return next;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

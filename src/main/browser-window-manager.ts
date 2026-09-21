import { BrowserWindow } from "electron";
import * as path from "path";

/**
 * Manages auxiliary browser windows opened by the agent via openBrowserWindow.
 * Each window is keyed by a caller-supplied (or generated) id so subsequent
 * injectJS calls can target it.
 */

const windows = new Map<string, BrowserWindow>();
let counter = 0;

function nextId(): string {
  return "win_" + Date.now().toString(36) + "_" + ++counter;
}

export interface OpenOptions {
  width?: number;
  height?: number;
}

/** Open a new window and return its id. */
export function openWindow(id: string | null, url: string, options: OpenOptions = {}): string {
  const windowId = id && id.trim() ? id.trim() : nextId();

  // Reuse an existing window with the same id: navigate it instead of stacking.
  const existing = windows.get(windowId);
  if (existing && !existing.isDestroyed()) {
    void existing.loadURL(url);
    existing.focus();
    return windowId;
  }

  const win = new BrowserWindow({
    width: options.width ?? 1200,
    height: options.height ?? 800,
    title: "freecode — " + windowId,
    autoHideMenuBar: true,
    backgroundColor: "#0f0f0f",
    webPreferences: {
      // A plain page window: no freecode preload, no agent loop.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.removeMenu();
  void win.loadURL(url);

  win.on("closed", () => {
    windows.delete(windowId);
  });

  windows.set(windowId, win);
  console.log("[freecode] browser window opened:", windowId, url);
  return windowId;
}

/** Look up a window by id; throws when it is gone. */
export function getWindow(id: string): BrowserWindow {
  const win = windows.get(id);
  if (!win || win.isDestroyed()) throw new Error("Window not found: " + id);
  return win;
}

export function listWindows(): string[] {
  return Array.from(windows.keys());
}

/**
 * Run JS inside a webContents in the page's main world, with the code wrapped
 * in an async IIFE so `await` and `return` work.
 */
export async function executeInWebContents(
  wc: Electron.WebContents,
  code: string,
  options: { throwOnError?: boolean } = {},
): Promise<{ ok: boolean; value?: unknown; error?: string }> {
  const wrapped = "(async () => {\n" + code + "\n})()";
  try {
    const value = await wc.executeJavaScript(wrapped, true);
    return { ok: true, value };
  } catch (err) {
    const message = (err as Error).message;
    if (options.throwOnError) throw err;
    return { ok: false, error: message };
  }
}

/** Inject JS into the window with the given id. */
export async function injectJS(id: string, code: string): Promise<unknown> {
  const win = getWindow(id);
  return win.webContents.executeJavaScript("(async () => {\n" + code + "\n})()", true);
}

void path;

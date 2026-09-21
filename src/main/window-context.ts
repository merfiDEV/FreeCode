import type { BrowserWindow } from "electron";
import { getProviderByUrl } from "../providers";
import { getProjectDirForSession, setProjectDirForSession } from "./project-store";
import { getProviderState } from "./provider-state";

interface WindowCtx {
  win: BrowserWindow;
  projectDir: string | null;
  /** Provider that owns the page currently shown in this window. */
  providerId: string | null;
  /** Session id of the conversation currently shown in this window. */
  sessionId: string | null;
  /** Last URL we synchronised with, used by the polling safety net. */
  currentUrl: string;
}

/**
 * Bucket for chats that do not have a session id yet. When the URL later
 * gains an id (after the first message), the value moves to that id.
 */
const PENDING = "__pending__";

/** URL values that look like an id but are really fixed routes. */
const NON_SESSION_IDS = new Set(["new-chat", "new", "guest", "home", "chat"]);

const contexts = new Map<number, WindowCtx>();

/** Normalize a raw route id: drop well-known placeholders. */
function normalizeSessionId(id: string | null): string | null {
  if (!id) return null;
  return NON_SESSION_IDS.has(id.toLowerCase()) ? null : id;
}

export function addWindow(win: BrowserWindow): void {
  const ctx: WindowCtx = {
    win,
    projectDir: null,
    providerId: null,
    sessionId: null,
    currentUrl: "",
  };
  contexts.set(win.id, ctx);
  win.on("closed", () => contexts.delete(win.id));

  const sync = (url: string): void => {
    const provider = getProviderByUrl(url);
    const sessionId = provider ? normalizeSessionId(provider.extractSessionId(url)) : null;
    const providerId = provider ? provider.id : null;

    const sameTarget = sessionId === ctx.sessionId && providerId === ctx.providerId;
    if (sameTarget) return;

    const previous = ctx.sessionId;
    ctx.providerId = providerId;
    ctx.sessionId = sessionId;

    if (!providerId) {
      ctx.projectDir = null;
      return;
    }

    if (sessionId) {
      // Adopt any directory chosen before this chat got its id.
      const pending = getProjectDirForSession(providerId, PENDING);
      if (pending) {
        setProjectDirForSession(providerId, sessionId, pending);
        setProjectDirForSession(providerId, PENDING, null);
      }
      // Per-session directory, then the provider's last used directory.
      const perSession = getProjectDirForSession(providerId, sessionId);
      const lastUsed = getProviderState(providerId).lastProjectDir;
      ctx.projectDir = perSession ?? lastUsed ?? null;
      console.log(
        "[freecode] sync:",
        providerId,
        "session=" + sessionId,
        "perSession=" + (perSession ?? "-"),
        "lastUsed=" + (lastUsed ?? "-"),
      );
    } else {
      ctx.projectDir = previous ? null : getProjectDirForSession(providerId, PENDING);
    }
  };

  const notify = (): void => {
    if (!win.isDestroyed()) win.webContents.send("project-context-changed");
  };

  const handleNavigate = (url: string): void => {
    sync(url);
    notify();
  };

  win.webContents.on("did-navigate", (_e, url) => handleNavigate(url));
  win.webContents.on("did-navigate-in-page", (_e, url) => handleNavigate(url));

  // Some SPAs change the URL without emitting a navigation event we can rely
  // on, so poll for changes as a safety net.
  const poll = setInterval(() => {
    if (win.isDestroyed()) return;
    const url = win.webContents.getURL();
    if (url && url !== ctx.currentUrl) {
      ctx.currentUrl = url;
      sync(url);
      notify();
    }
  }, 800);
  win.on("closed", () => clearInterval(poll));

  // Seed the context with the initial URL.
  ctx.currentUrl = win.webContents.getURL();
  sync(ctx.currentUrl);
}

export function getContextByWebContents(wc: Electron.WebContents): WindowCtx | null {
  for (const ctx of contexts.values()) {
    if (ctx.win.webContents === wc) return ctx;
  }
  return null;
}

export function getProviderId(wc: Electron.WebContents): string | null {
  return getContextByWebContents(wc)?.providerId ?? null;
}

export function getProjectDir(wc: Electron.WebContents): string | null {
  const ctx = getContextByWebContents(wc);
  if (!ctx || !ctx.providerId) return null;
  if (ctx.projectDir) return ctx.projectDir;
  // Only fall back to the pending bucket while this window is still on a
  // chat that has no session id — never leak it into an existing conversation.
  return ctx.sessionId ? null : getProjectDirForSession(ctx.providerId, PENDING);
}

export function getSessionId(wc: Electron.WebContents): string | null {
  return getContextByWebContents(wc)?.sessionId ?? null;
}

/** Set the project directory for the current window and persist it per session. */
export function setProjectDir(wc: Electron.WebContents, dir: string | null): void {
  const ctx = getContextByWebContents(wc);
  if (!ctx || !ctx.providerId) return;
  ctx.projectDir = dir;
  setProjectDirForSession(ctx.providerId, ctx.sessionId ?? PENDING, dir);
}

import type { ToolDefinition } from "./types";
import { ok, fail, asObject } from "./types";
import * as browserWindows from "../main/browser-window-manager";

/**
 * Browser tools that drive auxiliary Electron windows.
 *   - openBrowserWindow(url, options?) — open a page window, return its id
 *   - injectJS(windowId, code)         — run JS in that window
 *   - injectPageJS(code, windowId?)    — run JS in the chat page (main world)
 */

interface OpenParams {
  url: string;
  id?: string;
  width?: number;
  height?: number;
}

export const OpenBrowserWindowTool: ToolDefinition<OpenParams> = {
  name: "openBrowserWindow",
  signature: "openBrowserWindow(url, { id?, width?, height? })",
  description:
    "Open an Electron browser window and return { windowId }. Pass that windowId to injectJS to run code in it.",
  mapArgs: (a) => {
    const opts = asObject(a[1]);
    return {
      url: a[0] as string,
      id: opts.id as string | undefined,
      width: opts.width as number | undefined,
      height: opts.height as number | undefined,
    };
  },
  async execute(params) {
    if (!params.url || typeof params.url !== "string") return fail("url is required");
    const windowId = browserWindows.openWindow(params.id ?? null, params.url, {
      width: params.width,
      height: params.height,
    });
    return ok({ windowId, message: "Window opened, id: " + windowId + ", url: " + params.url });
  },
};

interface InjectParams {
  windowId: string;
  code: string;
}

export const InjectJSTool: ToolDefinition<InjectParams> = {
  name: "injectJS",
  signature: "injectJS(windowId, code)",
  description:
    "Run JS in a window opened by openBrowserWindow. The code is wrapped in an async IIFE, so await and return work.",
  risky: true,
  mapArgs: (a) => ({ windowId: a[0] as string, code: a[1] as string }),
  async execute(params) {
    if (!params.windowId) return fail("windowId is required");
    if (typeof params.code !== "string") return fail("code is required");
    try {
      const value = await browserWindows.injectJS(params.windowId, params.code);
      return ok(value === undefined ? "(no return value)" : value);
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};

interface InjectPageParams {
  code: string;
  windowId?: string;
}

export const InjectPageJSTool: ToolDefinition<InjectPageParams> = {
  name: "injectPageJS",
  signature: "injectPageJS(code, windowId?)",
  description:
    "Run JS in the page's main world (like DevTools/F12). Without windowId it runs in the main chat window. " +
    "The code is wrapped in an async IIFE; the returned value must be JSON-compatible.",
  risky: true,
  mapArgs: (a) => ({ code: a[0] as string, windowId: a[1] as string | undefined }),
  async execute(params, ctx) {
    if (typeof params.code !== "string") return fail("code is required");
    try {
      const target = params.windowId
        ? browserWindows.getWindow(params.windowId).webContents
        : ctx.mainWebContents;
      if (!target) return fail("Main window is not available");
      const result = await browserWindows.executeInWebContents(target, params.code, { throwOnError: false });
      if (!result.ok) return fail(result.error ?? "Injection failed");
      return ok(result.value === undefined ? "(no return value)" : result.value);
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};

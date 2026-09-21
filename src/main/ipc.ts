import { ipcMain, dialog, BrowserWindow } from "electron";
import { createDefaultRegistry, JsRunner } from "../tools";
import { getProjectDir, setProjectDir, getContextByWebContents } from "./window-context";
import { buildInitPrompt } from "./project-context";
import { markLoggedIn } from "./paths";
import { readSettings, writeSettings, type Settings } from "./settings-store";

const registry = createDefaultRegistry();
const jsRunner = new JsRunner(registry);

/** Register every IPC handler used by the preload script. */
export function registerIpcHandlers(): void {
  ipcMain.handle("get-tool-names", () => registry.list().map((t) => ({ name: t.name, description: t.description })));

  ipcMain.handle("execute-js", async (event, payload: { code: string }) => {
    const projectDir = getProjectDir(event.sender);
    const result = await jsRunner.run(payload.code, projectDir);
    const digest = jsRunner.formatResult(result);
    return { ok: result.success, digest, logs: result.logs, error: result.error ?? null };
  });

  ipcMain.handle("get-project-dir", (event) => getProjectDir(event.sender));

  // Called once by the renderer after a successful z.ai sign-in.
  ipcMain.handle("mark-logged-in", () => {
    markLoggedIn();
    return true;
  });

  // ===== Settings =====
  ipcMain.handle("get-settings", () => readSettings());
  ipcMain.handle("set-settings", (_event, patch: Partial<Settings>) => writeSettings(patch));

  /**
   * Pick a project directory and return its assembled init prompt.
   * Uses the synchronous dialog so it reliably appears above the Electron
   * window, then restores focus to the chat (otherwise the composer stops
   * accepting input after the dialog closes).
   */
  ipcMain.handle("init-project", async (event) => {
    const ctx = getContextByWebContents(event.sender);
    const parent = ctx ? ctx.win : BrowserWindow.getFocusedWindow() ?? undefined;

    const options: Electron.OpenDialogOptions = {
      properties: ["openDirectory"],
      title: "Select project directory",
      buttonLabel: "Select",
    };

    let dirs: string[] | undefined;
    try {
      dirs = parent ? dialog.showOpenDialogSync(parent, options) : dialog.showOpenDialogSync(options);
    } catch (err) {
      console.error("[freecode] showOpenDialogSync failed:", (err as Error).message);
      return { canceled: true, projectDir: null, prompt: "", error: (err as Error).message };
    }

    if (parent && !parent.isDestroyed()) {
      parent.focus();
      parent.webContents.focus();
    }

    if (!dirs || dirs.length === 0) return { canceled: true, projectDir: null, prompt: "" };

    const dir = dirs[0];
    setProjectDir(event.sender, dir);
    const prompt = buildInitPrompt(dir, registry);
    console.log("[freecode] project selected:", dir, "| prompt length:", prompt.length);
    return { canceled: false, projectDir: dir, prompt };
  });
}

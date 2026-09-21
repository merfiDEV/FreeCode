import { app, ipcMain, dialog, shell, BrowserWindow } from "electron";
import { createDefaultRegistry, JsRunner } from "../tools";
import { getProjectDir, setProjectDir, getContextByWebContents, getProviderId } from "./window-context";
import { buildInitPrompt } from "./project-context";
import { markLoggedIn, hasLoginMarker, dataRoot } from "./paths";
import { readSettings, writeSettings, type Settings } from "./settings-store";
import { getAllProviders, getProvider, getProviderByUrl } from "../providers";
import { createMainWindow } from "./window";
import { getHubWindow } from "./hub-window";
import { getAllProviderStates, touchProvider } from "./provider-state";

const registry = createDefaultRegistry();
const jsRunner = new JsRunner(registry);

/** Register every IPC handler used by the preload script and the hub. */
export function registerIpcHandlers(): void {
  // ===== Provider window IPC =====
  ipcMain.handle("get-tool-names", () => registry.list().map((t) => ({ name: t.name, description: t.description })));

  ipcMain.handle("execute-js", async (event, payload: { code: string }) => {
    const projectDir = getProjectDir(event.sender);
    const result = await jsRunner.run(payload.code, projectDir);
    const digest = jsRunner.formatResult(result);
    return { ok: result.success, digest, logs: result.logs, error: result.error ?? null };
  });

  ipcMain.handle("get-project-dir", (event) => getProjectDir(event.sender));

  // Provider list for the overlay's platform selector.
  ipcMain.handle("list-providers", () =>
    getAllProviders().map((p) => ({ id: p.id, name: p.name, host: p.host })),
  );

  ipcMain.handle("mark-logged-in", (event) => {
    const provider =
      getProviderId(event.sender) !== null
        ? getAllProviders().find((p) => p.id === getProviderId(event.sender))
        : getProviderByUrl(event.sender.getURL());
    if (provider) markLoggedIn(provider.id);
    return true;
  });

  ipcMain.handle("get-settings", () => readSettings());
  ipcMain.handle("set-settings", (_event, patch: Partial<Settings>) => writeSettings(patch));

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

    // Remember the last project for this provider so the hub can show it.
    const providerId = getProviderId(event.sender);
    if (providerId) touchProvider(providerId, { lastProjectDir: dir });

    const prompt = buildInitPrompt(dir, registry);
    console.log("[freecode] project selected:", dir, "| prompt length:", prompt.length);
    return { canceled: false, projectDir: dir, prompt };
  });

  /**
   * Switch the active platform from the in-chat overlay. Each provider has its
   * own session partition, so we open a fresh window for it and close the
   * current one.
   */
  ipcMain.handle("switch-provider", (event, providerId: string) => {
    const provider = getProvider(providerId);
    if (!provider) return { ok: false, error: "Unknown provider: " + providerId };

    writeSettings({ providerId });
    touchProvider(providerId, { lastUsedAt: Date.now() });
    const startUrl = hasLoginMarker(provider.id) ? provider.homeUrl : provider.authUrl;
    createMainWindow(provider, startUrl);

    const ctx = getContextByWebContents(event.sender);
    if (ctx && !ctx.win.isDestroyed()) ctx.win.close();
    return { ok: true };
  });

  // ===== Hub IPC =====
  ipcMain.handle("hub-list-providers", () => {
    const states = getAllProviderStates();
    return getAllProviders().map((p) => {
      const st = states[p.id] ?? { lastProjectDir: null, lastUsedAt: null };
      return {
        id: p.id,
        name: p.name,
        host: p.host,
        loggedIn: hasLoginMarker(p.id),
        projectDir: st.lastProjectDir,
        lastUsedAt: st.lastUsedAt,
      };
    });
  });

  ipcMain.handle("hub-open-provider", (_event, providerId: string) => {
    const provider = getProvider(providerId);
    if (!provider) return { ok: false, error: "Unknown provider: " + providerId };

    writeSettings({ providerId });
    touchProvider(providerId, { lastUsedAt: Date.now() });
    const startUrl = hasLoginMarker(provider.id) ? provider.homeUrl : provider.authUrl;
    createMainWindow(provider, startUrl);

    // Close the hub: the platform window now takes over.
    const hub = getHubWindow();
    if (hub) hub.close();

    return { ok: true };
  });

  ipcMain.handle("hub-get-info", () => {
    const s = readSettings();
    return {
      version: app.getVersion(),
      dataRoot: dataRoot(),
      language: s.language,
      sendDelayMin: s.sendDelayMin,
      sendDelayMax: s.sendDelayMax,
    };
  });

  ipcMain.handle("hub-set-language", (_event, language: "en" | "ru") => {
    writeSettings({ language: language === "ru" ? "ru" : "en" });
    return true;
  });

  ipcMain.handle("hub-set-send-delay", (_event, payload: { min: number; max: number }) => {
    writeSettings({ sendDelayMin: payload.min, sendDelayMax: payload.max });
    return true;
  });

  ipcMain.handle("hub-open-data-folder", async () => {
    await shell.openPath(dataRoot());
    return true;
  });

  ipcMain.handle("hub-check-updates", () => {
    // No updater wired yet — report the current version as the latest.
    const current = app.getVersion();
    return { current, latest: current, upToDate: true };
  });

  ipcMain.on("hub-close", () => {
    const hub = getHubWindow();
    if (hub) hub.close();
  });
}

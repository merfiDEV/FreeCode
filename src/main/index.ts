import { app } from "electron";
import { createMainWindow } from "./window";
import { registerIpcHandlers } from "./ipc";
import { dataRoot, hasLoginMarker } from "./paths";
import { applyUserAgentMask } from "./user-agent";
import { ZAI, APP } from "../shared/constants";

// Store the whole browser session (cookies, localStorage, cache) in a
// user-visible folder so the z.ai login survives restarts and upgrades.
// Must run before the first BrowserWindow is created.
app.setPath("userData", dataRoot());
app.setAppUserModelId(APP.name);

// Present ourselves as a regular Chrome browser.
applyUserAgentMask(app);
// Hide the most common automation flag so sites do not degrade the UI.
app.commandLine.appendSwitch("disable-blink-features", "AutomationControlled");

// The agent loop relies on an unthrottled, always-alive renderer.
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

// Keep a single instance: a second one sharing the same userData would
// corrupt the Chromium profile.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const { BrowserWindow } = require("electron") as typeof import("electron");
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

app.whenReady().then(() => {
  if (!gotLock) return;
  registerIpcHandlers();
  // First run (no stored login) goes straight to the auth page.
  const startUrl = hasLoginMarker() ? ZAI.homeUrl : ZAI.authUrl;
  console.log("[freecode] start URL:", startUrl);
  createMainWindow(startUrl);

  app.on("activate", () => {
    if (require("electron").BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(hasLoginMarker() ? ZAI.homeUrl : ZAI.authUrl);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

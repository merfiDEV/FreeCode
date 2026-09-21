import { app, BrowserWindow } from "electron";
import { createHubWindow } from "./hub-window";
import { registerIpcHandlers } from "./ipc";
import { dataRoot } from "./paths";
import { applyUserAgentMask } from "./user-agent";
import { APP } from "../shared/constants";

// Store the whole browser session (cookies, localStorage, cache) in a
// user-visible folder so logins survive restarts and upgrades.
// Must run before the first BrowserWindow is created.
app.setPath("userData", dataRoot());
app.setAppUserModelId(APP.name);

// Present ourselves as a regular Chrome browser (provider windows load the
// real chat sites, so the mask matters there; the hub is local).
applyUserAgentMask(app);
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
  console.log("[freecode] opening hub");
  // The hub is the start screen; the user picks a platform from there.
  createHubWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createHubWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

import { BrowserWindow } from "electron";
import * as path from "path";
import { APP } from "../shared/constants";

let hubWindow: BrowserWindow | null = null;

/** Open (or focus) the hub window — the app's start screen. */
export function createHubWindow(): BrowserWindow {
  if (hubWindow && !hubWindow.isDestroyed()) {
    hubWindow.show();
    hubWindow.focus();
    return hubWindow;
  }

  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    title: APP.name + " — Hub",
    autoHideMenuBar: true,
    backgroundColor: "#0e2018",
    webPreferences: {
      preload: path.join(__dirname, "..", "hub", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.removeMenu();
  void win.loadFile(path.join(__dirname, "..", "hub", "hub.html"));

  win.on("closed", () => {
    hubWindow = null;
  });

  hubWindow = win;
  return win;
}

export function getHubWindow(): BrowserWindow | null {
  return hubWindow && !hubWindow.isDestroyed() ? hubWindow : null;
}

/** Refresh the hub cards (after login/project changes). */
export function refreshHub(): void {
  const win = getHubWindow();
  if (win) win.webContents.send("hub-refresh");
}

import { BrowserWindow } from "electron";
import * as path from "path";
import { APP } from "../shared/constants";
import { appIconPath } from "./app-icon";

let hubWindow: BrowserWindow | null = null;

/** Open (or focus) the hub window — the app's start screen. */
export function createHubWindow(): BrowserWindow {
  if (hubWindow && !hubWindow.isDestroyed()) {
    hubWindow.show();
    hubWindow.focus();
    return hubWindow;
  }

  const win = new BrowserWindow({
    // Start maximised: the hub is the app's main screen and looks best full.
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    title: APP.name + " — Hub",
    icon: appIconPath(),
    autoHideMenuBar: true,
    backgroundColor: "#0e2018",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "hub", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.removeMenu();
  win.maximize();
  void win.loadFile(path.join(__dirname, "..", "hub", "hub.html"));

  // Show only once the first frame is ready to avoid a white flash.
  win.once("ready-to-show", () => {
    win.maximize();
    win.show();
  });

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

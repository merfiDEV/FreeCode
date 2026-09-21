import { BrowserWindow, shell } from "electron";
import * as path from "path";
import { addWindow } from "./window-context";
import { ZAI, APP } from "../shared/constants";

export function createMainWindow(startUrl: string = ZAI.homeUrl): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: APP.name,
    autoHideMenuBar: true,
    backgroundColor: "#0f0f0f",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Named persistent partition → cookies/localStorage are written under
      // <userData>/Partitions/zai and survive restarts (login persists).
      partition: "persist:zai",
    },
  });

  win.removeMenu();
  addWindow(win);

  // Keep external links out of the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  void win.loadURL(startUrl);
  return win;
}

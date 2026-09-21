import { BrowserWindow, shell } from "electron";
import * as path from "path";
import { addWindow } from "./window-context";
import { appIconPath } from "./app-icon";
import type { Provider } from "../shared/types";
import { APP } from "../shared/constants";

export function createMainWindow(provider: Provider, startUrl?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: APP.name,
    icon: appIconPath(),
    autoHideMenuBar: true,
    backgroundColor: "#0f0f0f",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // One persistent partition per provider → each site keeps its own
      // cookies/localStorage and never mixes sessions with another provider.
      partition: provider.partition,
    },
  });

  win.removeMenu();
  addWindow(win);

  // Keep external links out of the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  void win.loadURL(startUrl ?? provider.homeUrl);
  return win;
}

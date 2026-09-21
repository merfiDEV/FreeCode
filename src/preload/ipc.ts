/**
 * Typed wrappers around the main-process IPC channels.
 * Preload code calls these directly — no contextBridge round-trip needed.
 */
import { ipcRenderer } from "electron";
import type { ElectronAPI, Settings } from "./types";

export const ipc: ElectronAPI = {
  executeJs: (code: string) => ipcRenderer.invoke("execute-js", { code }),
  initProject: () => ipcRenderer.invoke("init-project"),
  getProjectDir: () => ipcRenderer.invoke("get-project-dir"),
  getToolNames: () => ipcRenderer.invoke("get-tool-names"),
  markLoggedIn: () => ipcRenderer.invoke("mark-logged-in"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSettings: (patch: Partial<Settings>) => ipcRenderer.invoke("set-settings", patch),
  onProjectContextChanged: (cb: () => void) => {
    const listener = (): void => cb();
    ipcRenderer.on("project-context-changed", listener);
    return () => ipcRenderer.removeListener("project-context-changed", listener);
  },
};

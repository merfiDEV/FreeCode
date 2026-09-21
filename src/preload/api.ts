import { contextBridge } from "electron";
import { ipc } from "./ipc";
import type { ElectronAPI } from "./types";

/**
 * Publish the API to the page's main world so scripts running outside the
 * preload bundle can use it. Preload modules themselves import "./ipc"
 * directly (contextBridge does not cross the isolated-world boundary).
 */
export function exposeApi(): void {
  try {
    contextBridge.exposeInMainWorld("electronAPI", ipc);
  } catch (err) {
    console.warn("[freecode] contextBridge failed:", (err as Error).message);
  }
}

export type { ElectronAPI };

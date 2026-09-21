import { contextBridge, ipcRenderer } from "electron";

/** Provider row shown on the hub. */
export interface HubProvider {
  id: string;
  name: string;
  host: string;
  loggedIn: boolean;
  projectDir: string | null;
  lastUsedAt: number | null;
}

export interface HubInfo {
  version: string;
  dataRoot: string;
  language: "en" | "ru";
  sendDelayMin: number;
  sendDelayMax: number;
}

export interface HubAPI {
  listProviders(): Promise<HubProvider[]>;
  openProvider(id: string): Promise<{ ok: boolean; error?: string }>;
  getInfo(): Promise<HubInfo>;
  setLanguage(lang: "en" | "ru"): Promise<void>;
  setSendDelay(min: number, max: number): Promise<void>;
  openDataFolder(): Promise<void>;
  checkUpdates(): Promise<{ current: string; latest: string; upToDate: boolean }>;
  /** Subscribe to hub refresh events (returned after login/project change). */
  onRefresh(cb: () => void): () => void;
  close(): void;
}

const api: HubAPI = {
  listProviders: () => ipcRenderer.invoke("hub-list-providers"),
  openProvider: (id: string) => ipcRenderer.invoke("hub-open-provider", id),
  getInfo: () => ipcRenderer.invoke("hub-get-info"),
  setLanguage: (lang) => ipcRenderer.invoke("hub-set-language", lang),
  setSendDelay: (min, max) => ipcRenderer.invoke("hub-set-send-delay", { min, max }),
  openDataFolder: () => ipcRenderer.invoke("hub-open-data-folder"),
  checkUpdates: () => ipcRenderer.invoke("hub-check-updates"),
  onRefresh: (cb: () => void) => {
    const listener = (): void => cb();
    ipcRenderer.on("hub-refresh", listener);
    return () => ipcRenderer.removeListener("hub-refresh", listener);
  },
  close: () => ipcRenderer.send("hub-close"),
};

try {
  contextBridge.exposeInMainWorld("hubAPI", api);
} catch (err) {
  console.warn("[freecode] hub contextBridge failed:", (err as Error).message);
}

/**
 * Typed wrappers around the main-process IPC channels.
 * Preload code calls these directly — no contextBridge round-trip needed.
 */
import { ipcRenderer } from "electron";
import type { ElectronAPI, Settings, McpServerDef } from "./types";

export const ipc: ElectronAPI = {
  executeJs: (code: string) => ipcRenderer.invoke("execute-js", { code }),
  initProject: () => ipcRenderer.invoke("init-project"),
  getProjectDir: () => ipcRenderer.invoke("get-project-dir"),
  getToolNames: () => ipcRenderer.invoke("get-tool-names"),
  markLoggedIn: () => ipcRenderer.invoke("mark-logged-in"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSettings: (patch: Partial<Settings>) => ipcRenderer.invoke("set-settings", patch),
  listProviders: () => ipcRenderer.invoke("list-providers"),
  switchProvider: (providerId: string) => ipcRenderer.invoke("switch-provider", providerId),
  // ===== MCP =====
  listMcpServers: () => ipcRenderer.invoke("list-mcp-servers"),
  upsertMcpServer: (server: McpServerDef) => ipcRenderer.invoke("upsert-mcp-server", { server }),
  removeMcpServer: (name: string) => ipcRenderer.invoke("remove-mcp-server", { name }),
  enableMcpServer: (name: string) => ipcRenderer.invoke("enable-mcp-server", { name }),
  disableMcpServer: (name: string) => ipcRenderer.invoke("disable-mcp-server", { name }),
  getMcpTools: () => ipcRenderer.invoke("get-mcp-tools"),
  connectEnabledMcpServers: () => ipcRenderer.invoke("connect-enabled-mcp-servers"),

  onProjectContextChanged: (cb: () => void) => {
    const listener = (): void => cb();
    ipcRenderer.on("project-context-changed", listener);
    return () => ipcRenderer.removeListener("project-context-changed", listener);
  },
};

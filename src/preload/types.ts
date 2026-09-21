export interface Settings {
  providerId: string;
  sendDelayMin: number;
  sendDelayMax: number;
  language: "en" | "ru";
}

export interface ProviderInfo {
  id: string;
  name: string;
  host: string;
}

export interface McpServerStatus {
  name: string;
  type: string;
  enabled: boolean;
  connected: boolean;
  toolCount: number;
}

export interface McpServerDef {
  name: string;
  type: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export interface ElectronAPI {
  executeJs(code: string): Promise<{ ok: boolean; digest: string; logs: string[]; error: string | null }>;
  initProject(): Promise<{ canceled: boolean; projectDir: string | null; prompt: string; error?: string }>;
  getProjectDir(): Promise<string | null>;
  getToolNames(): Promise<Array<{ name: string; description: string }>>;
  markLoggedIn(): Promise<boolean>;
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<Settings>;
  listProviders(): Promise<ProviderInfo[]>;
  switchProvider(providerId: string): Promise<{ ok: boolean; error?: string }>;

  // ===== MCP =====
  listMcpServers(): Promise<{ success: boolean; servers: McpServerStatus[]; config: McpServerDef[] }>;
  upsertMcpServer(server: McpServerDef): Promise<{ success: boolean }>;
  removeMcpServer(name: string): Promise<{ success: boolean }>;
  enableMcpServer(name: string): Promise<{ success: boolean; error?: string }>;
  disableMcpServer(name: string): Promise<{ success: boolean }>;
  getMcpTools(): Promise<{ success: boolean; tools: Array<{ server: string; name: string; description: string }> }>;
  connectEnabledMcpServers(): Promise<{ success: boolean; connected: string[] }>;
  /** Subscribe to project-context changes (session switch). Returns an unsubscribe fn. */
  onProjectContextChanged(cb: () => void): () => void;
}

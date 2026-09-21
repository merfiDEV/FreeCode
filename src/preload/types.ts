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
  /** Subscribe to project-context changes (session switch). Returns an unsubscribe fn. */
  onProjectContextChanged(cb: () => void): () => void;
}

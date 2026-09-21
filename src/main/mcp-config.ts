import * as fs from "fs";
import * as path from "path";
import { dataRoot } from "./paths";

/**
 * MCP configuration.
 *
 * mcp.json uses the mainstream MCP format, so it can be shared/imported:
 * {
 *   "mcpServers": {
 *     "filesystem": { "command": "npx", "args": ["-y", "..."], "env": {} },
 *     "remote-db":  { "url": "https://...", "headers": {} }
 *   }
 * }
 *
 * Enable/disable state lives in mcp-state.json so the main file stays
 * portable: { "filesystem": true, "remote-db": false }
 */

export type McpServerType = "stdio" | "http";

export interface McpServer {
  name: string;
  type: McpServerType;
  enabled: boolean;
  /** stdio */
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  /** http */
  url?: string;
  headers?: Record<string, string>;
}

interface McpConfigFile {
  mcpServers: Record<string, Record<string, unknown>>;
}

function configPath(): string {
  return path.join(dataRoot(), "mcp.json");
}

function statePath(): string {
  return path.join(dataRoot(), "mcp-state.json");
}

function readConfig(): McpConfigFile {
  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<McpConfigFile>;
    if (parsed && typeof parsed.mcpServers === "object" && parsed.mcpServers) {
      return { mcpServers: parsed.mcpServers };
    }
  } catch {
    /* missing or corrupt — start clean */
  }
  return { mcpServers: {} };
}

function writeConfig(config: McpConfigFile): boolean {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), "utf-8");
    console.log("[freecode][mcp] config saved:", configPath());
    return true;
  } catch (err) {
    console.error("[freecode][mcp] failed to write config:", (err as Error).message);
    return false;
  }
}

function readState(): Record<string, boolean> {
  try {
    const raw = fs.readFileSync(statePath(), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Record<string, boolean>;
  } catch {
    /* ignore */
  }
  return {};
}

function writeState(state: Record<string, boolean>): boolean {
  try {
    fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[freecode][mcp] failed to write state:", (err as Error).message);
    return false;
  }
}

/** All configured servers, with their enable flag resolved. */
export function getServers(): McpServer[] {
  const config = readConfig();
  const state = readState();
  const out: McpServer[] = [];
  for (const [name, def] of Object.entries(config.mcpServers)) {
    const d = (def ?? {}) as Record<string, unknown>;
    out.push({
      name,
      type: d.url ? "http" : "stdio",
      command: typeof d.command === "string" ? d.command : undefined,
      args: Array.isArray(d.args) ? (d.args as string[]) : [],
      env: (d.env as Record<string, string>) || undefined,
      url: typeof d.url === "string" ? d.url : undefined,
      headers: (d.headers as Record<string, string>) || undefined,
      enabled: state[name] !== false,
    });
  }
  return out;
}

export function getEnabledServers(): McpServer[] {
  return getServers().filter((s) => s.enabled);
}

/** Insert or update a server definition. */
export function upsertServer(server: McpServer): McpServer {
  const config = readConfig();
  const def: Record<string, unknown> = {};
  if (server.type === "http") {
    if (server.url) def.url = server.url;
    if (server.headers) def.headers = server.headers;
  } else {
    if (server.command) def.command = server.command;
    if (server.args && server.args.length) def.args = server.args;
    if (server.env) def.env = server.env;
    if (server.cwd) def.cwd = server.cwd;
  }
  config.mcpServers[server.name] = def;
  writeConfig(config);
  return server;
}

export function setServerEnabled(name: string, enabled: boolean): boolean {
  const state = readState();
  state[name] = !!enabled;
  return writeState(state);
}

export function removeServer(name: string): boolean {
  const config = readConfig();
  delete config.mcpServers[name];
  writeConfig(config);
  const state = readState();
  delete state[name];
  writeState(state);
  return true;
}

export { configPath as getConfigFile, statePath as getStateFile };

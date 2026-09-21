import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import * as mcpConfig from "./mcp-config";
import { APP } from "../shared/constants";
import type { McpServer } from "./mcp-config";

/**
 * MCP client manager: connects to stdio and HTTP MCP servers, tracks the tools
 * they expose, and forwards calls.
 */

interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface Connection {
  client: Client;
  tools: McpToolInfo[];
  connected: boolean;
}

/** server name -> connection */
const connections = new Map<string, Connection>();

async function connectServer(server: McpServer): Promise<Connection> {
  const existing = connections.get(server.name);
  if (existing) return existing;

  let transport;
  if (server.type === "stdio") {
    transport = new StdioClientTransport({
      command: server.command ?? "",
      args: server.args ?? [],
      env: server.env ?? {},
      cwd: server.cwd,
      stderr: "pipe",
    });
  } else if (server.type === "http") {
    transport = new StreamableHTTPClientTransport(new URL(server.url ?? ""), {
      requestInit: server.headers ? { headers: server.headers } : undefined,
    });
  } else {
    throw new Error("Unknown MCP server type: " + server.type);
  }

  const client = new Client({ name: "freecode", version: "0.1.6" });
  await client.connect(transport);

  let tools: McpToolInfo[] = [];
  try {
    const result = await client.listTools({});
    tools = (result.tools ?? []) as McpToolInfo[];
  } catch (err) {
    console.error("[freecode][mcp] failed to list tools:", server.name, (err as Error).message);
  }

  const entry: Connection = { client, tools, connected: true };
  connections.set(server.name, entry);
  console.log("[freecode][mcp] connected:", server.name, "| tools:", tools.length);
  return entry;
}

async function disconnectServer(name: string): Promise<void> {
  const entry = connections.get(name);
  if (!entry) return;
  try {
    await entry.client.close();
  } catch {
    /* ignore */
  }
  connections.delete(name);
  console.log("[freecode][mcp] disconnected:", name);
}

/** Connect every enabled server (best effort, no throw). */
export async function connectEnabledServers(): Promise<string[]> {
  for (const server of mcpConfig.getEnabledServers()) {
    try {
      await connectServer(server);
    } catch (err) {
      console.error("[freecode][mcp] connection failed:", server.name, (err as Error).message);
    }
  }
  return Array.from(connections.keys());
}

export async function connectServerByName(name: string): Promise<Connection> {
  const server = mcpConfig.getServers().find((s) => s.name === name && s.enabled);
  if (!server) throw new Error("MCP server does not exist or is disabled: " + name);
  return connectServer(server);
}

export async function disconnectServerByName(name: string): Promise<void> {
  await disconnectServer(name);
}

/** Call a tool on a server, connecting on demand. */
export async function callMcpTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  let entry = connections.get(serverName);
  if (!entry) entry = await connectServerByName(serverName);
  return entry.client.callTool({ name: toolName, arguments: args });
}

export interface McpToolRow {
  server: string;
  name: string;
  description: string;
  inputSchema: unknown;
}

export function getMcpToolList(): McpToolRow[] {
  const out: McpToolRow[] = [];
  for (const [serverName, entry] of connections) {
    for (const tool of entry.tools) {
      out.push({
        server: serverName,
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema ?? {},
      });
    }
  }
  return out;
}

export interface McpServerStatus {
  name: string;
  type: string;
  enabled: boolean;
  connected: boolean;
  toolCount: number;
}

/** All configured servers with their live connection state. */
export function listConfiguredServers(): McpServerStatus[] {
  return mcpConfig.getServers().map((s) => {
    const entry = connections.get(s.name);
    return {
      name: s.name,
      type: s.type,
      enabled: s.enabled,
      connected: !!entry?.connected,
      toolCount: entry ? entry.tools.length : 0,
    };
  });
}

/** Tools exposed by one server (connects on demand). */
export async function getToolsByServer(name: string): Promise<McpToolInfo[]> {
  let entry = connections.get(name);
  if (!entry) entry = await connectServerByName(name);
  return entry.tools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    inputSchema: t.inputSchema ?? {},
  }));
}

// Keep APP import referenced (used for the client name/version in future).
void APP;

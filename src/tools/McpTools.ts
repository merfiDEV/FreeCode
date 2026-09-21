import type { ToolDefinition } from "./types";
import { ok, fail, asObject } from "./types";
import * as mcpClient from "../main/mcp-client";

/**
 * Tools that expose MCP servers to the agent:
 *   - mcpListServers()           — what is configured and connected
 *   - mcpGetTools(serverName)    — the tools a server offers
 *   - mcpCall(server, tool, args) — invoke a server tool
 */

interface CallParams {
  server: string;
  tool: string;
  args?: Record<string, unknown>;
}

export const McpCallTool: ToolDefinition<CallParams> = {
  name: "mcpCall",
  signature: "mcpCall(server, tool, args)",
  description: "Call a tool provided by an MCP server.",
  risky: true,
  mapArgs: (a) => {
    const opts = asObject(a[2]);
    return { server: a[0], tool: a[1], args: opts };
  },
  async execute(params) {
    if (!params.server || typeof params.server !== "string") return fail("server is required");
    if (!params.tool || typeof params.tool !== "string") return fail("tool is required");

    try {
      const result = (await mcpClient.callMcpTool(
        params.server,
        params.tool,
        params.args ?? {},
      )) as { content?: Array<{ type?: string; text?: string }>; isError?: boolean };

      const content = result.content ?? [];
      let text = "";
      for (const item of content) {
        if (item && item.type === "text" && typeof item.text === "string") {
          text += (text ? "\n" : "") + item.text;
        }
      }

      if (result.isError) {
        return fail(params.server + "." + params.tool + ": " + (text || "MCP tool returned an error"));
      }
      return ok(text || "(no output)");
    } catch (err) {
      return fail("MCP call failed: " + (err as Error).message);
    }
  },
};

interface GetToolsParams {
  server: string;
}

export const McpGetToolsTool: ToolDefinition<GetToolsParams> = {
  name: "mcpGetTools",
  signature: "mcpGetTools(serverName)",
  description: "List the tools a given MCP server provides (names and arguments).",
  mapArgs: (a) => ({ server: a[0] }),
  async execute(params) {
    if (!params.server || typeof params.server !== "string") return fail("server is required");
    try {
      const tools = await mcpClient.getToolsByServer(params.server);
      if (tools.length === 0) return ok('Server "' + params.server + '" exposes no tools.');

      const lines = tools.map((t) => {
        let line = "- " + t.name + (t.description ? " - " + t.description : "");
        const schema = (t.inputSchema as { properties?: Record<string, { type?: string; description?: string }> })
          ?.properties;
        if (schema && Object.keys(schema).length > 0) {
          const props = Object.entries(schema).map(
            ([k, v]) => k + ": " + (v.type ?? "any") + (v.description ? " (" + v.description + ")" : ""),
          );
          line += "\n  args: " + props.join(", ");
        }
        return line;
      });
      return ok(params.server + " tools:\n\n" + lines.join("\n"));
    } catch (err) {
      return fail('Failed to list tools for "' + params.server + '": ' + (err as Error).message);
    }
  },
};

export const McpListServersTool: ToolDefinition<Record<string, never>> = {
  name: "mcpListServers",
  signature: "mcpListServers()",
  description: "List configured MCP servers with their enabled/connected state and tool count.",
  async execute() {
    try {
      const servers = mcpClient.listConfiguredServers();
      if (servers.length === 0) return ok("No MCP servers are configured.");

      const allTools = mcpClient.getMcpToolList();
      const lines: string[] = [];
      for (const s of servers) {
        const status = !s.enabled ? "disabled" : s.connected ? "connected" : "not connected";
        lines.push("- " + s.name + " [" + s.type + "] " + status + ", tools: " + s.toolCount);
        if (s.connected) {
          for (const t of allTools.filter((x) => x.server === s.name)) {
            lines.push("  - " + t.name);
          }
        }
      }
      return ok(lines.join("\n"));
    } catch (err) {
      return fail("Failed to list MCP servers: " + (err as Error).message);
    }
  },
};

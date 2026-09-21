import { ToolRegistry } from "./ToolRegistry";
import { FileReadTool } from "./FileReadTool";
import { FileWriteTool } from "./FileWriteTool";
import { FileEditTool } from "./FileEditTool";
import { FileDeleteTool } from "./FileDeleteTool";
import { GlobTool } from "./GlobTool";
import { GrepTool } from "./GrepTool";
import { BashTool } from "./BashTool";
import { PwshTool } from "./PwshTool";
import { McpCallTool, McpGetToolsTool, McpListServersTool } from "./McpTools";

export { ToolRegistry } from "./ToolRegistry";
export { JsRunner } from "./JsRunner";
export type { JsRunResult } from "./JsRunner";
export * from "./types";

/** Build a registry with every built-in tool registered. */
export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  const all = [
    FileReadTool,
    FileWriteTool,
    FileEditTool,
    FileDeleteTool,
    GlobTool,
    GrepTool,
    BashTool,
    PwshTool,
    McpCallTool,
    McpGetToolsTool,
    McpListServersTool,
  ] as unknown as Array<import("./types").ToolDefinition<Record<string, unknown>>>;
  for (const tool of all) registry.register(tool);
  return registry;
}

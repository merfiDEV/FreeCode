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
import { TodoWriteTool, TodoEditTool, TodoDeleteTool } from "./TodoTools";
import { OpenBrowserWindowTool, InjectJSTool, InjectPageJSTool } from "./BrowserTools";
import { SkillListTool, SkillLoadTool, SkillExecuteTool } from "./SkillTools";
import { AskUserQuestionTool } from "./AskUserQuestionTool";
import { ReadClipboardTool, WriteClipboardTool } from "./ClipboardTool";

export { ToolRegistry } from "./ToolRegistry";
export { JsRunner } from "./JsRunner";
export type { JsRunResult } from "./JsRunner";
export * from "./types";

/** Build a registry with every built-in tool registered. */
export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  const all = [
    // Files
    FileReadTool,
    FileWriteTool,
    FileEditTool,
    FileDeleteTool,
    // Search
    GlobTool,
    GrepTool,
    // Shell
    BashTool,
    PwshTool,
    // MCP
    McpCallTool,
    McpGetToolsTool,
    McpListServersTool,
    // Tasks
    TodoWriteTool,
    TodoEditTool,
    TodoDeleteTool,
    // Browser windows
    OpenBrowserWindowTool,
    InjectJSTool,
    InjectPageJSTool,
    // Skills
    SkillListTool,
    SkillLoadTool,
    SkillExecuteTool,
    // Interaction
    AskUserQuestionTool,
    // Clipboard
    ReadClipboardTool,
    WriteClipboardTool,
  ] as unknown as Array<import("./types").ToolDefinition<Record<string, unknown>>>;
  for (const tool of all) registry.register(tool);
  return registry;
}

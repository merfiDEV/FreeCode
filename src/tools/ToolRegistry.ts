import { ToolDefinition } from "./types";

/** Holds the set of tools the AI may call from inside a sandbox block. */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition<Record<string, unknown>>>();

  register(tool: ToolDefinition<Record<string, unknown>>): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition<Record<string, unknown>> | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition<Record<string, unknown>>[] {
    return Array.from(this.tools.values());
  }
}

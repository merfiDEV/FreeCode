import type { ToolResult } from "../shared/types";

/** Execution context passed to every tool. */
export interface ToolContext {
  /** Project root the AI has been given; relative paths resolve here. */
  projectDir: string | null;
}

export interface ToolDefinition<P = Record<string, unknown>> {
  /** Tool name as called from inside the sandbox. */
  name: string;
  /**
   * Call signature shown to the model, e.g.
   * "read(filePath, { offset?, limit? })". Generated per tool and injected
   * into the system prompt by project-context.
   */
  signature: string;
  description: string;
  /** Whether the call mutates the filesystem or spawns a process. */
  risky?: boolean;
  /**
   * Extra sandbox names routed to this tool (kept for compatibility, e.g.
   * readLines -> read).
   */
  aliases?: string[];
  /**
   * Convert positional sandbox arguments into the tool's params object.
   * When omitted, the first argument is treated as the params object.
   */
  mapArgs?: (args: unknown[]) => Record<string, unknown>;
  execute(params: P, ctx: ToolContext): Promise<ToolResult>;
}

export function ok(data: unknown): ToolResult {
  return { success: true, data };
}

export function fail(error: string): ToolResult {
  return { success: false, error };
}

/** Narrow an unknown value to a plain object (empty object otherwise). */
export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

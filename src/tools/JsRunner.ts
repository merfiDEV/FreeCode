import * as vm from "vm";
import { ToolRegistry } from "./ToolRegistry";
import { asObject } from "./types";
import { OUTPUT_LIMIT, TIMEOUTS } from "../shared/constants";

export interface JsRunResult {
  success: boolean;
  /** Combined console output of all log() calls. */
  logs: string[];
  /** Raw value returned by the script's `return`, if any. */
  returnValue?: unknown;
  error?: string;
}

/**
 * Executes AI-authored JavaScript in a locked-down Node VM.
 *
 * The sandbox exposes one function per registered tool (plus its aliases),
 * log() and projectDir. require/process/global are unreachable, so the AI
 * cannot escape through the usual Node channels.
 */
export class JsRunner {
  constructor(private readonly registry: ToolRegistry) {}

  async run(code: string, projectDir: string | null): Promise<JsRunResult> {
    const logs: string[] = [];

    const callTool = async (toolName: string, params: Record<string, unknown>): Promise<unknown> => {
      const def = this.registry.get(toolName);
      if (!def) throw new Error("Unknown tool: " + toolName);
      const result = await def.execute(params, { projectDir });
      if (!result.success) throw new Error(result.error ?? ("Tool " + toolName + " failed"));
      return result.data;
    };

    const sandbox: Record<string, unknown> = {
      projectDir,
      log: (...args: unknown[]) => {
        logs.push(args.map(stringify).join(" "));
      },
    };

    for (const tool of this.registry.list()) {
      const fn = async (...args: unknown[]): Promise<unknown> => {
        const params = tool.mapArgs ? tool.mapArgs(args) : asObject(args[0]);
        return callTool(tool.name, params);
      };
      sandbox[tool.name] = fn;
      for (const alias of tool.aliases ?? []) sandbox[alias] = fn;
    }

    let result: unknown;
    try {
      const context = vm.createContext(sandbox, {
        codeGeneration: { strings: false, wasm: false },
      });
      const wrapped = "(async () => {\n" + code + "\n})()";
      const script = new vm.Script(wrapped, { filename: "ai-tool-block.js" });
      const promise = script.runInContext(context, { timeout: TIMEOUTS.jsSyncTimeout }) as Promise<unknown>;
      result = await withDeadline(promise, TIMEOUTS.jsRunDeadline);
    } catch (err) {
      return { success: false, logs, error: (err as Error).message };
    }

    return { success: true, logs, returnValue: result };
  }

  /** Build the human-readable digest sent back to the AI. */
  formatResult(result: JsRunResult): string {
    const parts: string[] = [];
    if (result.logs.length) parts.push(result.logs.join("\n"));
    if (result.error) parts.push("[error] " + result.error);
    if (result.returnValue !== undefined) parts.push("[return] " + stringify(result.returnValue));
    let out = parts.join("\n") || "(no output)";
    if (out.length > OUTPUT_LIMIT) out = out.slice(0, OUTPUT_LIMIT) + "\n...(output truncated)";
    return out;
  }
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Execution timed out (" + ms + " ms)")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

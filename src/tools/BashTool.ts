import { exec } from "child_process";
import * as path from "path";
import { isDangerousCommand } from "./dangerous";
import { ok, fail, asObject, ToolDefinition } from "./types";
import { joinCommandArgs } from "./command-args";
import { TIMEOUTS, OUTPUT_LIMIT } from "../shared/constants";

interface BashParams {
  command: string;
  workdir?: string;
  timeoutMs?: number;
}

/**
 * Run a shell command. On Windows this uses cmd.exe, elsewhere /bin/sh.
 * Non-zero exits are reported inside the output with an [exit code: N] marker
 * instead of throwing, so the AI can react.
 */
export const BashTool: ToolDefinition<BashParams> = {
  name: "bash",
  signature: "bash(command, { workdir?, timeoutMs? })",
  description: "Run a shell command (cmd.exe on Windows).",
  risky: true,
  mapArgs: (a) => {
    // The options object may sit at the end (after any number of command parts).
    const last = a[a.length - 1];
    const opts = last && typeof last === "object" && !Array.isArray(last) ? asObject(last) : {};
    return { command: joinCommandArgs(a), workdir: opts.workdir, timeoutMs: opts.timeoutMs };
  },
  async execute(params, ctx) {
    const command = typeof params.command === "string" ? params.command.trim() : "";
    if (!command) return fail("command is required");
    if (isDangerousCommand(command))
      return fail("Command rejected by the safety policy: " + command);

    const cwd = params.workdir
      ? path.resolve(ctx.projectDir ?? ".", params.workdir as string)
      : ctx.projectDir ?? process.cwd();
    const timeout = Math.min(
      TIMEOUTS.command * 10,
      Math.max(1000, Math.floor(Number(params.timeoutMs) || TIMEOUTS.command)),
    );

    return new Promise((resolve) => {
      exec(
        command,
        { cwd, timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
        (err, stdout, stderr) => {
          let out = stdout ?? "";
          if (stderr && stderr.trim()) out += (out ? "\n" : "") + "[stderr]\n" + stderr;
          if (err) {
            const code = (err as NodeJS.ErrnoException & { code?: number }).code;
            if ((err as { killed?: boolean }).killed) out += "\n[timed out]";
            else if (typeof code === "number") out += "\n[exit code: " + code + "]";
            else out += "\n[error] " + err.message;
          }
          if (out.length > OUTPUT_LIMIT) out = out.slice(-OUTPUT_LIMIT) + "\n...(output truncated)";
          resolve(ok(out || "(no output)"));
        },
      );
    });
  },
};

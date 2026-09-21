import { exec } from "child_process";
import * as path from "path";
import { isDangerousCommand } from "./dangerous";
import { ok, fail, asObject, ToolDefinition } from "./types";
import { joinCommandArgs } from "./command-args";
import { TIMEOUTS, OUTPUT_LIMIT } from "../shared/constants";

interface PwshParams {
  command: string;
  workdir?: string;
  timeoutMs?: number;
}

function quoteForPwsh(cmd: string): string {
  return "'" + cmd.replace(/'/g, "''") + "'";
}

/** Run a PowerShell command via powershell -NoProfile -Command. */
export const PwshTool: ToolDefinition<PwshParams> = {
  name: "pwsh",
  signature: "pwsh(command, { workdir?, timeoutMs? })",
  description: "Run a PowerShell command (powershell -NoProfile -Command).",
  risky: true,
  mapArgs: (a) => {
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
    const full = "powershell -NoProfile -Command " + quoteForPwsh(command);

    return new Promise((resolve) => {
      exec(
        full,
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

import { exec } from "child_process";
import * as path from "path";
import { isDangerousCommand } from "./dangerous";
import { ok, fail, asObject, ToolDefinition } from "./types";
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
    const opts = asObject(a[1]);
    return { command: a[0], workdir: opts.workdir, timeoutMs: opts.timeoutMs };
  },
  async execute(params, ctx) {
    if (!params.command || typeof params.command !== "string") return fail("command is required");
    if (isDangerousCommand(params.command))
      return fail("Command rejected by the safety policy: " + params.command);

    const cwd = params.workdir
      ? path.resolve(ctx.projectDir ?? ".", params.workdir as string)
      : ctx.projectDir ?? process.cwd();
    const timeout = Math.min(
      TIMEOUTS.command * 10,
      Math.max(1000, Math.floor(Number(params.timeoutMs) || TIMEOUTS.command)),
    );
    const full = "powershell -NoProfile -Command " + quoteForPwsh(params.command);

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

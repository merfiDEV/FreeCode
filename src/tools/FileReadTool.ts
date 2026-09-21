import * as fs from "fs";
import { resolvePath, assertExists } from "./path-utils";
import { ok, fail, asObject, ToolDefinition } from "./types";

interface ReadParams {
  file_path: string;
  offset?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 2000;
const MAX_LIMIT = 2000;

/**
 * Read a UTF-8 text file with 1-based line numbers, windowed by offset/limit.
 */
export const FileReadTool: ToolDefinition<ReadParams> = {
  name: "read",
  signature: "read(filePath, { offset?, limit? })",
  description: "Read a UTF-8 text file with line numbers (offset/limit window).",
  aliases: ["readLines"],
  mapArgs: (a) => {
    const opts = asObject(a[1]);
    return { file_path: a[0], offset: opts.offset, limit: opts.limit };
  },
  async execute(params, ctx) {
    try {
      const abs = resolvePath(ctx.projectDir, params.file_path as string);
      assertExists(abs);
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) return fail("This is a directory, not a file: " + abs);

      const raw = fs.readFileSync(abs, "utf-8");
      const allLines = raw.split(/\r?\n/);
      const total = allLines.length;

      const offset = Math.max(1, Math.floor(Number(params.offset) || 1));
      if (offset > total)
        return fail("offset " + offset + " is beyond the end of the file (" + total + " lines)");
      const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(params.limit) || DEFAULT_LIMIT)));
      const slice = allLines.slice(offset - 1, offset - 1 + limit);

      const numbered = slice.map((line, i) => String(offset + i) + ": " + line).join("\n");
      const end = offset - 1 + slice.length;
      const footer =
        end < total
          ? "\n\n(Showing " + slice.length + " of " + total + " lines. Continue with offset=" + (end + 1) + ")"
          : "\n\n(End of file. Total " + total + " lines.)";

      const content =
        "<path>" + abs + "</path>\n" +
        "<type>file</type>\n" +
        "<content>\n" + numbered + footer + "\n</content>";

      return ok(content);
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};

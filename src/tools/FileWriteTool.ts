import * as fs from "fs";
import * as path from "path";
import { resolvePath } from "./path-utils";
import { sanitizeFileContent } from "./sanitize-content";
import { ok, fail, ToolDefinition } from "./types";

interface WriteParams {
  file_path: string;
  content: string;
}

/** Create or overwrite a UTF-8 text file, creating parent directories. */
export const FileWriteTool: ToolDefinition<WriteParams> = {
  name: "write",
  signature: "write(filePath, content)",
  description: "Create or overwrite a UTF-8 text file.",
  risky: true,
  aliases: ["writeFile"],
  mapArgs: (a) => ({ file_path: a[0], content: a[1] }),
  async execute(params, ctx) {
    try {
      if (typeof params.content !== "string")
        return fail("Parameter 'content' is required and must be a string");

      // The model sometimes pastes a read result back verbatim (with "N:" line
      // numbers and <path>/<content> tags). Unwrap that before writing.
      const content = sanitizeFileContent(params.content);

      const abs = resolvePath(ctx.projectDir, params.file_path as string);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const existed = fs.existsSync(abs);
      fs.writeFileSync(abs, content, "utf-8");
      return ok(
        "<path>" + abs + "</path>\n<type>file</type>\n<content>\n" +
          (existed ? "Updated file" : "Created file") +
          "\n</content>",
      );
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};

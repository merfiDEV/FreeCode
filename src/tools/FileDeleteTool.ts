import * as fs from "fs";
import { resolvePath, assertExists } from "./path-utils";
import { ok, fail, ToolDefinition } from "./types";

interface DeleteParams {
  file_path: string;
}

/** Delete a single file. Directories are rejected. */
export const FileDeleteTool: ToolDefinition<DeleteParams> = {
  name: "deleteFile",
  signature: "deleteFile(filePath)",
  description: "Delete a single file (not a directory).",
  risky: true,
  mapArgs: (a) => ({ file_path: a[0] }),
  async execute(params, ctx) {
    try {
      const abs = resolvePath(ctx.projectDir, params.file_path as string);
      assertExists(abs);
      if (fs.statSync(abs).isDirectory())
        return fail("This is a directory; deleting directories is not supported: " + abs);
      fs.unlinkSync(abs);
      return ok({ message: "Deleted file " + abs, path: abs });
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};

import * as fs from "fs";
import { resolvePath, assertExists } from "./path-utils";
import { sanitizeFileContent } from "./sanitize-content";
import { ok, fail, ToolDefinition } from "./types";

interface EditParams {
  file_path: string;
  old_string: string;
  new_string: string;
  replaceAll?: boolean;
  dryRun?: boolean;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

/**
 * Replace a literal old_string with new_string in an existing file.
 * By default old_string must match exactly once; use replaceAll for many.
 */
export const FileEditTool: ToolDefinition<EditParams> = {
  name: "edit",
  signature: "edit(filePath, oldString, newString, replaceAll?, dryRun?)",
  description: "Replace a literal string in an existing file.",
  risky: true,
  aliases: ["editFile"],
  mapArgs: (a) => ({
    file_path: a[0],
    old_string: a[1],
    new_string: a[2],
    replaceAll: a[3] === true,
    dryRun: a[4] === true,
  }),
  async execute(params, ctx) {
    try {
      const { old_string, new_string } = params;
      if (typeof old_string !== "string" || typeof new_string !== "string")
        return fail("old_string and new_string are required");
      if (old_string === new_string) return fail("old_string and new_string are identical");

      // Both sides may carry read-result artefacts ("N:" prefixes, tags).
      const oldClean = sanitizeFileContent(old_string);
      const newClean = sanitizeFileContent(new_string);

      const abs = resolvePath(ctx.projectDir, params.file_path as string);
      assertExists(abs);
      const content = fs.readFileSync(abs, "utf-8");

      // Try the sanitized old_string first, then the raw one.
      let needle = oldClean;
      let count = countOccurrences(content, needle);
      if (count === 0 && oldClean !== old_string) {
        needle = old_string;
        count = countOccurrences(content, needle);
      }

      if (count === 0) return fail("old_string not found in file " + abs);
      if (count > 1 && !params.replaceAll)
        return fail(
          "old_string occurs " + count + " times; make old_string more specific or set replaceAll=true",
        );

      const replaced = params.replaceAll ? count : 1;

      if (params.dryRun) {
        return ok("dryRun: would replace " + replaced + " occurrence(s) in " + abs);
      }

      const updated = params.replaceAll
        ? content.split(needle).join(newClean)
        : content.replace(needle, newClean);

      fs.writeFileSync(abs, updated, "utf-8");
      return ok("Updated " + abs + " (" + replaced + " replacement(s)).");
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};

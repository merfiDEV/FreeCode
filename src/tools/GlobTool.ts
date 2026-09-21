import * as fs from "fs";
import * as path from "path";
import { resolvePath, isDirectory } from "./path-utils";
import { ok, fail, ToolDefinition } from "./types";

interface GlobParams {
  pattern: string;
  path?: string;
}

const SKIP_DIRS = new Set([".git", ".svn", ".hg", "node_modules"]);

/** Convert a glob pattern into a RegExp matching a POSIX-style relative path. */
function globToRegExp(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        if (pattern[i + 2] === "/") {
          re += "(?:[^/]+/)*";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^$()|{}[]\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

/**
 * Find files by glob pattern.
 * A pattern without "/" matches the basename at any depth.
 */
export const GlobTool: ToolDefinition<GlobParams> = {
  name: "glob",
  signature: "glob(pattern, searchPath?)",
  description: "Find files by glob pattern (supports **, *, ?).",
  mapArgs: (a) => ({ pattern: a[0], path: a[1] }),
  async execute(params, ctx) {
    try {
      if (!params.pattern) return fail("pattern is required");
      const base = params.path ? resolvePath(ctx.projectDir, params.path as string) : ctx.projectDir;
      if (!base) return fail("Project is not initialized");
      if (!isDirectory(base)) return fail("Search directory not found: " + base);

      const pattern = String(params.pattern).replace(/\\/g, "/");
      const hasSlash = pattern.includes("/");
      const re = globToRegExp(hasSlash ? pattern : "**/" + pattern);
      const limit = 500;
      const results: string[] = [];

      const walk = (dir: string, rel: string): void => {
        if (results.length >= limit) return;
        let entries: fs.Dirent[];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          if (results.length >= limit) return;
          const childRel = rel ? rel + "/" + entry.name : entry.name;
          if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            walk(path.join(dir, entry.name), childRel);
          } else if (entry.isFile()) {
            if (re.test(childRel)) results.push(childRel);
          }
        }
      };

      walk(base, "");
      const footer =
        results.length >= limit
          ? "\n(Showing " + results.length + " paths; refine the pattern for more)"
          : "\n(Found " + results.length + " files)";
      return ok(results.join("\n") + footer);
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};

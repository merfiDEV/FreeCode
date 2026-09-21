import * as fs from "fs";
import * as path from "path";
import { resolvePath, isDirectory } from "./path-utils";
import { ok, fail, asObject, ToolDefinition } from "./types";

interface GrepParams {
  pattern: string;
  path?: string;
  include?: string;
}

const SKIP_DIRS = new Set([".git", ".svn", ".hg", "node_modules"]);
const MAX_MATCHES = 250;
const MAX_FILESIZE = 2 * 1024 * 1024;

function globish(g: string): string {
  return g
    .replace(/[.+^$()|{}[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
}

function includeToRegExp(include?: string): RegExp | null {
  if (!include) return null;
  const brace = include.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (brace) {
    const alts = brace[2].split(",").map((a) => a.trim());
    const expanded = alts.map((a) => brace[1] + a + brace[3]);
    return new RegExp("^(" + expanded.map((g) => globish(g)).join("|") + ")$");
  }
  return new RegExp("^" + globish(include) + "$");
}

/** Search file contents with a regular expression. */
export const GrepTool: ToolDefinition<GrepParams> = {
  name: "grep",
  signature: "grep(pattern, { path?, include? })",
  description: "Search file contents with a regular expression.",
  mapArgs: (a) => {
    const opts = asObject(a[1]);
    return { pattern: a[0], path: opts.path, include: opts.include };
  },
  async execute(params, ctx) {
    try {
      if (!params.pattern) return fail("pattern is required");
      let re: RegExp;
      try {
        re = new RegExp(params.pattern);
      } catch (e) {
        return fail("Invalid regular expression: " + (e as Error).message);
      }
      const includeRe = includeToRegExp(params.include);
      const base = params.path ? resolvePath(ctx.projectDir, params.path as string) : ctx.projectDir;
      if (!base) return fail("Project is not initialized");
      if (!fs.existsSync(base)) return fail("Path not found: " + base);

      const byFile = new Map<string, string[]>();
      let total = 0;

      const scanFile = (abs: string, rel: string): void => {
        if (total >= MAX_MATCHES) return;
        let stat: fs.Stats;
        try {
          stat = fs.statSync(abs);
        } catch {
          return;
        }
        if (stat.size > MAX_FILESIZE) return;
        let content: string;
        try {
          content = fs.readFileSync(abs, "utf-8");
        } catch {
          return;
        }
        if (content.includes("\u0000")) return;
        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length && total < MAX_MATCHES; i++) {
          if (re.test(lines[i])) {
            const bucket = byFile.get(rel) ?? [];
            bucket.push("Line " + (i + 1) + ": " + lines[i].slice(0, 300));
            byFile.set(rel, bucket);
            total++;
          }
        }
      };

      const walk = (dir: string, rel: string): void => {
        if (total >= MAX_MATCHES) return;
        let entries: fs.Dirent[];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          if (total >= MAX_MATCHES) return;
          const childRel = rel ? rel + "/" + entry.name : entry.name;
          if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            walk(path.join(dir, entry.name), childRel);
          } else if (entry.isFile()) {
            if (includeRe && !includeRe.test(entry.name) && !includeRe.test(childRel)) continue;
            scanFile(path.join(dir, entry.name), childRel);
          }
        }
      };

      if (!isDirectory(base)) {
        scanFile(base, path.basename(base));
      } else {
        walk(base, "");
      }

      if (total === 0) return ok("No matches found");
      let out = "Found " + total + " matches\n";
      for (const [file, lines] of byFile) {
        out += "\n" + file + "\n" + lines.join("\n") + "\n";
      }
      return ok(out.trimEnd());
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};

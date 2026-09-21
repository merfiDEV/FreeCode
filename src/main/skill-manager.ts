import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

/**
 * SkillManager — loads and runs custom Skills.
 *
 * A Skill is a directory under <projectDir>/.freecode/skills/<name>/ with a
 * required SKILL.md (Markdown instructions) and an optional tool.js that
 * exports one or more async functions.
 */

const SKILLS_DIR_NAME = ".freecode";
const SKILLS_SUBDIR = "skills";

export interface SkillScan {
  name: string;
  hasSkillMd: boolean;
  hasToolJs: boolean;
}

interface LoadedSkill {
  name: string;
  dir: string;
  skillMd: string;
  toolExports: Record<string, (...args: unknown[]) => unknown> | null;
}

export class SkillManager {
  private skills = new Map<string, LoadedSkill>();

  getSkillsRoot(projectDir: string): string {
    return path.join(projectDir, SKILLS_DIR_NAME, SKILLS_SUBDIR);
  }

  listSkillNames(): string[] {
    return Array.from(this.skills.keys());
  }

  /** Scan for available Skills without loading them. */
  scanAvailableSkills(projectDir: string): SkillScan[] {
    const root = this.getSkillsRoot(projectDir);
    const result: SkillScan[] = [];
    try {
      if (!fs.existsSync(root)) return result;
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const dir = path.join(root, entry.name);
        result.push({
          name: entry.name,
          hasSkillMd: fs.existsSync(path.join(dir, "SKILL.md")),
          hasToolJs: fs.existsSync(path.join(dir, "tool.js")),
        });
      }
    } catch {
      /* unreadable — treat as empty */
    }
    return result;
  }

  /** Load one Skill (reads SKILL.md, evaluates tool.js in a sandbox). */
  loadSkill(projectDir: string, skillName: string): { success: boolean; error?: string; skill?: LoadedSkill } {
    if (!projectDir) return { success: false, error: "Project directory is not initialized" };
    if (!skillName) return { success: false, error: "Skill name is empty" };

    const root = this.getSkillsRoot(projectDir);
    const dir = path.join(root, skillName);
    const mdPath = path.join(dir, "SKILL.md");
    const toolPath = path.join(dir, "tool.js");

    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      return { success: false, error: "Skill directory not found: " + dir };
    }
    if (!fs.existsSync(mdPath)) {
      return { success: false, error: "Skill is missing SKILL.md: " + mdPath };
    }

    let skillMd = "";
    try {
      skillMd = fs.readFileSync(mdPath, "utf-8");
    } catch (err) {
      return { success: false, error: "Failed to read SKILL.md: " + (err as Error).message };
    }

    let toolExports: LoadedSkill["toolExports"] = null;
    if (fs.existsSync(toolPath)) {
      try {
        const code = fs.readFileSync(toolPath, "utf-8");
        toolExports = this.loadToolModule(code, dir, projectDir);
      } catch (err) {
        return { success: false, error: "Failed to load tool.js: " + (err as Error).message };
      }
    }

    const skill: LoadedSkill = { name: skillName, dir, skillMd, toolExports };
    this.skills.set(skillName, skill);
    console.log("[freecode][skill] loaded:", skillName, toolExports ? "(with tool.js)" : "");
    return { success: true, skill };
  }

  unloadAll(): void {
    this.skills.clear();
  }

  /** Run an exported function of a loaded Skill. */
  async executeSkill(
    skillName: string,
    functionName: string,
    args: Record<string, unknown>,
    projectDir: string,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const skill = this.skills.get(skillName);
    if (!skill) return { success: false, error: 'Skill is not loaded: "' + skillName + '". Use skillLoad first.' };
    if (!skill.toolExports) return { success: false, error: 'Skill "' + skillName + '" has no tool.js' };
    if (!functionName) return { success: false, error: "Function name is empty" };

    const fn = skill.toolExports[functionName];
    if (typeof fn !== "function") {
      const available = Object.keys(skill.toolExports).filter((k) => typeof skill.toolExports![k] === "function");
      return {
        success: false,
        error:
          'Skill "' + skillName + '" has no function "' + functionName + '"' +
          (available.length ? ". Available: " + available.join(", ") : ""),
      };
    }

    try {
      const data = await fn.call(null, args ?? {}, { projectDir, skillDir: skill.dir });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: "Skill function failed: " + (err as Error).message };
    }
  }

  /**
   * Evaluate tool.js in a locked sandbox. Only a limited fs/path surface is
   * exposed, scoped to the skill and project directories.
   */
  private loadToolModule(
    code: string,
    skillDir: string,
    projectDir: string,
  ): Record<string, (...args: unknown[]) => unknown> {
    const moduleObj: { exports: Record<string, unknown> } = { exports: {} };

    const limitedFs = (() => {
      const out: Record<string, unknown> = {};
      const methods = ["readFileSync", "writeFileSync", "existsSync", "readdirSync", "statSync", "lstatSync"];
      for (const method of methods) {
        out[method] = (...args: unknown[]) => {
          const resolved = this.resolveAllowedPath(skillDir, projectDir, args[0] as string);
          return (fs as unknown as Record<string, (...a: unknown[]) => unknown>)[method](resolved, ...args.slice(1));
        };
      }
      return out;
    })();

    const limitedPath: Record<string, unknown> = {};
    for (const method of ["join", "basename", "dirname", "extname", "resolve", "relative", "isAbsolute", "sep", "normalize"]) {
      limitedPath[method] =
        typeof (path as unknown as Record<string, unknown>)[method] === "function"
          ? (...args: unknown[]) => (path as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args)
          : (path as unknown as Record<string, unknown>)[method];
    }

    const sandbox: Record<string, unknown> = {
      module: moduleObj,
      exports: moduleObj.exports,
      console: {
        log: (...a: unknown[]) => console.log("[freecode][skill:" + path.basename(skillDir) + "]", ...a),
        error: (...a: unknown[]) => console.error("[freecode][skill:" + path.basename(skillDir) + "]", ...a),
        warn: (...a: unknown[]) => console.warn("[freecode][skill:" + path.basename(skillDir) + "]", ...a),
      },
      fs: limitedFs,
      path: limitedPath,
      __skillDir: skillDir,
      __filename: path.join(skillDir, "tool.js"),
      __dirname: skillDir,
    };
    try {
      Object.setPrototypeOf(sandbox, null);
    } catch {
      /* best effort */
    }

    const context = vm.createContext(sandbox, {
      codeGeneration: { strings: false, wasm: false },
      name: "freecode-skill-sandbox",
    });

    const wrapped =
      "(function(require, module, exports, __filename, __dirname, console, fs, path, __skillDir) {\n" +
      code +
      "\n})";
    new vm.Script(wrapped, { filename: "freecode-skill-tool.js" }).runInContext(context, { timeout: 10000 });
    const wrapperFn = vm.runInContext("(" + wrapped + ")", context, { timeout: 10000 }) as (
      ...args: unknown[]
    ) => void;

    wrapperFn(
      (name: string) => {
        if (name === "fs") return limitedFs;
        if (name === "path") return limitedPath;
        throw new Error("Skill tool.js may not require: " + name);
      },
      moduleObj,
      moduleObj.exports,
      path.join(skillDir, "tool.js"),
      skillDir,
      sandbox.console,
      limitedFs,
      limitedPath,
      skillDir,
    );

    return moduleObj.exports as Record<string, (...args: unknown[]) => unknown>;
  }

  /** Resolve a path, allowing only the skill and project directories. */
  private resolveAllowedPath(skillDir: string, projectDir: string, p: string): string {
    if (typeof p !== "string") throw new Error("Path must be a string");
    const normalized = path.isAbsolute(p) ? p : path.join(skillDir, p);
    const resolved = path.resolve(normalized);

    const roots = [skillDir, projectDir].filter(Boolean).map((r) => path.resolve(r));
    for (const root of roots) {
      if (resolved === root || resolved.startsWith(root + path.sep)) return resolved;
    }
    throw new Error("Access outside the skill/project directory is not allowed: " + p);
  }
}

let instance: SkillManager | null = null;

/** Shared SkillManager instance. */
export function getSkillManager(): SkillManager {
  if (!instance) instance = new SkillManager();
  return instance;
}

import type { ToolDefinition, ToolContext } from "./types";
import { ok, fail, asObject } from "./types";
import { getSkillManager } from "../main/skill-manager";

/**
 * Skill tools: user-defined extensions under <projectDir>/.cuckoo/skills/.
 *   - skillList()                       — what is available
 *   - skillLoad(name)                   — read SKILL.md + tool.js
 *   - skillExecute(skill, fn, args)     — call an exported function
 */

function projectDirOf(ctx: ToolContext): string | null {
  return ctx.projectDir;
}

export const SkillListTool: ToolDefinition<Record<string, never>> = {
  name: "skillList",
  signature: "skillList()",
  description: "List custom Skills available in the current project, with their load state.",
  async execute(_params, ctx) {
    const projectDir = projectDirOf(ctx);
    if (!projectDir) return fail("Project directory is not initialized");
    try {
      const manager = getSkillManager();
      const available = manager.scanAvailableSkills(projectDir);
      const loaded = manager.listSkillNames();

      if (available.length === 0) {
        return ok(
          "No custom Skills in this project.\n" +
            "Create <projectDir>/.cuckoo/skills/<name>/SKILL.md to define one; " +
            "an optional tool.js may export callable functions.",
        );
      }

      const lines = available.map((s) => {
        const flags: string[] = [];
        if (s.hasSkillMd) flags.push("SKILL.md");
        if (s.hasToolJs) flags.push("tool.js");
        return (
          "- " + s.name + " [" + (loaded.includes(s.name) ? "loaded" : "not loaded") + "]" +
          (flags.length ? " files: " + flags.join(", ") : "")
        );
      });
      return ok("Project Skills (" + available.length + "):\n\n" + lines.join("\n") + "\n\nUse skillLoad then skillExecute.");
    } catch (err) {
      return fail("Failed to scan Skills: " + (err as Error).message);
    }
  },
};

interface LoadParams {
  name: string;
}

export const SkillLoadTool: ToolDefinition<LoadParams> = {
  name: "skillLoad",
  signature: "skillLoad(name)",
  description: "Load a custom Skill (reads SKILL.md and optional tool.js).",
  mapArgs: (a) => ({ name: a[0] as string }),
  async execute(params, ctx) {
    if (!params.name || typeof params.name !== "string") return fail("name is required");
    const projectDir = projectDirOf(ctx);
    if (!projectDir) return fail("Project directory is not initialized");
    try {
      const result = getSkillManager().loadSkill(projectDir, params.name);
      if (!result.success || !result.skill) return fail(result.error ?? "Load failed");

      const skill = result.skill;
      const functions = skill.toolExports
        ? Object.keys(skill.toolExports).filter((k) => typeof skill.toolExports![k] === "function")
        : [];
      const fnInfo = functions.length
        ? "Callable functions: " + functions.join(", ") + "\n\n"
        : "This Skill has no tool.js, so it exposes no functions.\n\n";
      return ok('Skill "' + params.name + '" loaded.\n\n' + fnInfo + "--- SKILL.md ---\n\n" + skill.skillMd);
    } catch (err) {
      return fail("Failed to load Skill: " + (err as Error).message);
    }
  },
};

interface ExecuteParams {
  skill: string;
  function: string;
  args?: Record<string, unknown>;
}

export const SkillExecuteTool: ToolDefinition<ExecuteParams> = {
  name: "skillExecute",
  signature: "skillExecute(skill, function, args)",
  description: "Call a function exported by a loaded Skill's tool.js.",
  risky: true,
  mapArgs: (a) => {
    const opts = asObject(a[2]);
    return { skill: a[0] as string, function: a[1] as string, args: opts };
  },
  async execute(params, ctx) {
    if (!params.skill || typeof params.skill !== "string") return fail("skill is required");
    if (!params.function || typeof params.function !== "string") return fail("function is required");
    try {
      const result = await getSkillManager().executeSkill(
        params.skill,
        params.function,
        params.args ?? {},
        ctx.projectDir ?? "",
      );
      if (!result.success) return fail(result.error ?? "Execution failed");
      const data = result.data;
      if (typeof data === "string") return ok(data);
      if (data === undefined || data === null) return ok("(function finished with no return value)");
      try {
        return ok(JSON.stringify(data, null, 2));
      } catch {
        return ok(String(data));
      }
    } catch (err) {
      return fail("Skill function failed: " + (err as Error).message);
    }
  },
};

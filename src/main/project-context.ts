import * as fs from "fs";
import * as path from "path";
import { ToolRegistry } from "../tools";

/** Directories that are never worth showing to the model. */
const IGNORED_DIRS = new Set([
  "node_modules", "target", "build", "dist", "out", ".git", ".svn", ".hg",
  "__pycache__", ".pytest_cache", ".coverage", "vendor", "bower_components",
  "jspm_packages", ".idea", ".vscode", ".vs", "logs", "tmp", "temp", "bin", "obj",
]);

const PROMPT_DIR = path.join(__dirname, "..", "prompt");

/** Recursive directory tree (Windows `tree` style), ignoring noise. */
export function getDirectoryTree(dir: string, prefix = ""): string {
  try {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith("."))
      .filter((e) => !e.isDirectory() || !IGNORED_DIRS.has(e.name))
      .sort((a, b) =>
        a.isDirectory() !== b.isDirectory() ? (a.isDirectory() ? -1 : 1) : a.name.localeCompare(b.name),
      );

    let tree = "";
    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      tree += prefix + (isLast ? "└── " : "├── ") + entry.name + (entry.isDirectory() ? "/" : "") + "\n";
      if (entry.isDirectory()) tree += getDirectoryTree(path.join(dir, entry.name), prefix + (isLast ? "    " : "│   "));
    });
    return tree;
  } catch {
    return prefix + "└── [unreadable: " + dir + "]\n";
  }
}

function platformInfo(): string {
  const arch = process.arch;
  if (process.platform === "win32")
    return (
      "- OS: Windows (" + arch + ")\n" +
      "  - bash runs through cmd.exe (dir, type, findstr, echo %cd%)\n" +
      "  - pwsh runs through PowerShell (Get-Location, Get-ChildItem)\n" +
      "  - path separator is a backslash, but pass relative paths to tools with forward slashes"
    );
  if (process.platform === "darwin")
    return "- OS: macOS (" + arch + ")\n  - bash runs through zsh/bash\n  - path separator is /";
  return "- OS: Linux (" + arch + ")\n  - bash runs through bash\n  - path separator is /";
}

/**
 * Build the tool list from the registry. Every tool supplies its own call
 * signature and description, so adding a new tool automatically documents it
 * in the prompt.
 */
function toolsList(registry: ToolRegistry): string {
  return registry
    .list()
    .map((t) => "- \`" + t.signature + "\` — " + t.description)
    .join("\n");
}

/**
 * Assemble the project-init prompt: template + tool list + platform + tree.
 * Relative tool paths resolve against `selectedDir`.
 */
export function buildInitPrompt(selectedDir: string, registry: ToolRegistry): string {
  let template: string;
  try {
    template = fs.readFileSync(path.join(PROMPT_DIR, "system.md"), "utf-8");
  } catch (err) {
    console.error("[freecode] failed to read system.md:", (err as Error).message);
    return "";
  }

  const tree = getDirectoryTree(selectedDir);
  const placeholders: Record<string, string> = {
    "{{TOOLS_LIST}}": toolsList(registry),
    "{{PLATFORM_INFO}}": platformInfo(),
    "{{PROJECT_DIR}}": selectedDir,
    "{{PROJECT_TREE}}": tree
      ? "\n\n## Project structure\n\n\`\`\`\n" + tree + "\`\`\`"
      : "",
  };

  let combined = template;
  for (const [key, value] of Object.entries(placeholders)) {
    combined = combined.split(key).join(value);
  }
  return combined;
}

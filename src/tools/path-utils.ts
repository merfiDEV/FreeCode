import * as path from "path";
import * as fs from "fs";

/**
 * Resolve a user-supplied path against the project root.
 * Absolute paths are returned as-is.
 */
export function resolvePath(projectDir: string | null, p: string): string {
  if (!p) throw new Error("Path is empty");
  if (path.isAbsolute(p)) return path.normalize(p);
  if (!projectDir) throw new Error("Project is not initialized: choose a project directory first");
  return path.resolve(projectDir, p);
}

export function assertExists(p: string): void {
  if (!fs.existsSync(p)) throw new Error("File not found: " + p);
}

export function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

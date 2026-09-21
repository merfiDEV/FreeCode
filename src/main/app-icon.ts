import * as path from "path";
import * as fs from "fs";

/**
 * Absolute path to the application icon used by windows and the taskbar.
 *
 * Prefers the .ico on Windows (best quality in the taskbar) and the .png
 * elsewhere. Returns undefined when the asset is missing so Electron falls
 * back to its default instead of throwing.
 */
export function appIconPath(): string | undefined {
  const buildDir = path.join(__dirname, "..", "..", "build");
  const candidates =
    process.platform === "win32"
      ? ["icon.ico", "icon.png"]
      : ["icon.png", "icon.ico"];
  for (const name of candidates) {
    const file = path.join(buildDir, name);
    if (fs.existsSync(file)) return file;
  }
  return undefined;
}

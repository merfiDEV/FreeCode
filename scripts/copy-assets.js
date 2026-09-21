/**
 * Copy non-TS assets into dist after tsc.
 *   - src/prompt/*        → dist/prompt/*        (agent prompt templates)
 *   - src/preload/assets/* → dist/preload/assets/* (overlay images)
 */
const fs = require("fs");
const path = require("path");

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const root = path.join(__dirname, "..");

copyDir(path.join(root, "src", "prompt"), path.join(root, "dist", "prompt"));

const assetsSrc = path.join(root, "src", "preload", "assets");
if (fs.existsSync(assetsSrc)) {
  copyDir(assetsSrc, path.join(root, "dist", "preload", "assets"));
}

console.log("[freecode] assets copied to dist");

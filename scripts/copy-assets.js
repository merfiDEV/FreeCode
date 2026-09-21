/**
 * Copy non-TS assets (prompt templates) into dist after tsc.
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
console.log("[freecode] assets copied to dist");

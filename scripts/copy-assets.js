/**
 * Copy non-TS assets into dist after tsc.
 *   - src/prompt/*        → dist/prompt/*          (agent prompt templates)
 *   - src/preload/assets/* → dist/preload/assets/*  (overlay images)
 *   - src/hub/*.html|css|js → dist/hub/*            (hub screen)
 */
const fs = require("fs");
const path = require("path");

function copyDir(src, dst, filter) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d, filter);
    else if (!filter || filter(entry.name)) fs.copyFileSync(s, d);
  }
}

const root = path.join(__dirname, "..");

copyDir(path.join(root, "src", "prompt"), path.join(root, "dist", "prompt"));

const assetsSrc = path.join(root, "src", "preload", "assets");
if (fs.existsSync(assetsSrc)) {
  copyDir(assetsSrc, path.join(root, "dist", "preload", "assets"));
}

// Hub screen: HTML/CSS/JS + logo images (the preload is compiled by tsc).
const hubSrc = path.join(root, "src", "hub");
if (fs.existsSync(hubSrc)) {
  copyDir(
    hubSrc,
    path.join(root, "dist", "hub"),
    (name) => (/\.(html|css|js|png|svg|webp)$/i.test(name) && name !== "preload.js"),
  );
}

console.log("[freecode] assets copied to dist");

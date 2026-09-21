/**
 * Extract the version from a GitHub Actions tag (GITHUB_REF_NAME or
 * APP_VERSION) and sync it into package.json and package-lock.json.
 * Usage: node scripts/sync-version.js
 */
const fs = require("fs");
const path = require("path");

const tag = process.env.APP_VERSION || process.env.GITHUB_REF_NAME || "";
const version = tag.replace(/^v/, "").trim();

if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error("[sync-version] cannot parse a version from tag: " + JSON.stringify(tag));
  process.exit(1);
}

const root = path.join(__dirname, "..");

// package.json
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log("[sync-version] package.json -> " + version);

// package-lock.json
const lockPath = path.join(root, "package-lock.json");
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  if (lock.version) lock.version = version;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = version;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  console.log("[sync-version] package-lock.json -> " + version);
}

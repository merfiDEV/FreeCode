/**
 * Regenerate the application icon (build/icon.png + build/icon.ico) from the
 * master PNG that also drives the overlay launcher.
 *
 * Source: src/preload/assets/freecode-icon.png  (1024x1024)
 * Output: build/icon.png (copy) and build/icon.ico (multi-size, Windows).
 *
 * Usage: node scripts/make-icon.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// png-to-ico v3 exposes the converter as `default`; v2 as the module itself.
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const root = path.join(__dirname, "..");
const source = path.join(root, "src", "preload", "assets", "freecode-icon.png");
const buildDir = path.join(root, "build");
const outPng = path.join(buildDir, "icon.png");
const outIco = path.join(buildDir, "icon.ico");

/** Sizes packed into the Windows .ico (Windows picks the best fit). */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  if (!fs.existsSync(source)) {
    console.error("[make-icon] master icon not found:", source);
    process.exit(1);
  }
  fs.mkdirSync(buildDir, { recursive: true });

  // 1. PNG used on macOS/Linux and by the dev window.
  fs.copyFileSync(source, outPng);
  console.log("[make-icon] wrote", outPng);

  // 2. Multi-size ICO for Windows (taskbar, alt-tab, installer).
  // png-to-ico only packs the images it is given, so every size is rendered
  // separately with sharp first.
  const scratch = path.join(buildDir, ".ico-src");
  fs.mkdirSync(scratch, { recursive: true });

  const inputs = [];
  for (const size of ICO_SIZES) {
    const file = path.join(scratch, "icon-" + size + ".png");
    await sharp(source).resize(size, size, { fit: "contain" }).png().toFile(file);
    inputs.push(file);
  }

  const buf = await pngToIco(inputs);
  fs.writeFileSync(outIco, buf);
  console.log("[make-icon] wrote", outIco, "(" + buf.length + " bytes,", ICO_SIZES.length, "sizes)");

  // Clean up the temporary downscaled copies.
  for (const f of inputs) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* ignore */
    }
  }
  try {
    fs.rmdirSync(scratch);
  } catch {
    /* ignore */
  }
}

main().catch((err) => {
  console.error("[make-icon] failed:", err.message);
  process.exit(1);
});

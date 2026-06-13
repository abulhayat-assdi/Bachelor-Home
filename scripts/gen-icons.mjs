// One-off: generate PWA PNG icons from public/icon.svg using sharp.
// Run with: node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "icon.svg"));
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  { size: 192, file: "icon-192.png" },
  { size: 512, file: "icon-512.png" },
  { size: 180, file: "apple-touch-icon.png" },
];

for (const { size, file } of targets) {
  await sharp(svg).resize(size, size).png().toFile(join(outDir, file));
  console.log("wrote", file, `${size}x${size}`);
}
console.log("done");

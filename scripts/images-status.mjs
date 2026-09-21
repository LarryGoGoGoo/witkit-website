/**
 * 图片到位情况自检
 *
 * 作用一：告诉你还差哪几张图、还差的每张要什么规格。
 * 作用二：揪出「文件名写错」的图 —— 这种图不会报错，只是永远不显示，
 *         比缺图更难发现，所以单独列出来。
 *
 * 跑法：node scripts/images-status.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const IMAGES = resolve(ROOT, "src/assets/images");
const MAX_BYTES = 300 * 1024;
const EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
  ".gif",
]);

const slots = JSON.parse(
  readFileSync(resolve(ROOT, "src/assets/imageSpecs.json"), "utf8"),
).slots;

function walk(dir, out = []) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.has(extname(name).toLowerCase())) out.push(full);
  }
  return out;
}

const found = new Map();
for (const file of walk(IMAGES)) {
  const key = relative(IMAGES, file)
    .replace(/\\/g, "/")
    .replace(/\.[^.]+$/, "");
  found.set(key, statSync(file).size);
}

const allManaged = slots.filter((s) => !s.external);
const external = slots.filter((s) => s.external);
/* 未使用位（specs 里 unused: true，板块删了、规格先留着）不计入进度 ——
   混在里面会让「还差几张图」这个数字虚高，也会让人误以为页面上真有个框在等图。
   但它们仍算「已知规格」，所以下面的 orphan 判定要用 allManaged，不然会把
   已经躺在目录里的 labs/*.png 误报成「文件名写错了」。 */
const managed = allManaged.filter((s) => !s.unused);
const unused = allManaged.filter((s) => s.unused);
const ready = managed.filter((s) => found.has(s.slot));
const pending = managed.filter((s) => !found.has(s.slot));
const orphan = [...found.keys()].filter(
  (k) => !allManaged.some((s) => s.slot === k),
);

const pct = managed.length
  ? Math.round((ready.length / managed.length) * 100)
  : 100;

console.log("");
console.log(`图片到位情况：${ready.length} / ${managed.length}（${pct}%）`);
if (unused.length) {
  console.log(
    `（另有 ${unused.length} 个规格保留但页面暂未使用的位，不计入分母：${unused
      .map((s) => s.slot)
      .join("、")}）`,
  );
}
console.log("─".repeat(64));

if (ready.length) {
  console.log("\n已就位");
  for (const s of ready) {
    const kb = Math.round(found.get(s.slot) / 1024);
    const heavy =
      found.get(s.slot) > MAX_BYTES ? "  ← 超过 300KB，建议压缩" : "";
    console.log(
      `  ✓  ${s.slot.padEnd(22)} ${String(kb).padStart(5)} KB${heavy}`,
    );
  }
}

if (pending.length) {
  console.log("\n待补");
  for (const s of pending) {
    console.log(`  ·  ${s.slot.padEnd(22)} ${s.px}  ${s.priority}`);
    console.log(`     ${s.where}`);
    console.log(`     ${s.content}`);
  }
}

if (external.length) {
  console.log("\n不走 src/assets，放 public/ 下（做完手动改 index.html）");
  for (const s of external) {
    console.log(`  ·  ${s.publicPath.padEnd(22)} ${s.px}  ${s.priority}`);
    console.log(`     ${s.content}`);
  }
}

if (unused.length) {
  console.log("\n规格保留、当前页面未使用（不用急着做）");
  for (const s of unused) {
    console.log(`  –  ${s.slot.padEnd(22)} ${s.where}`);
  }
}

if (orphan.length) {
  console.log(
    "\n注意：目录里有多余图片，不会被任何位置引用（多半是文件名写错了）",
  );
  for (const k of orphan) {
    console.log(`  !  ${k}  ← 检查文件名是否和规格表对得上`);
  }
}

console.log("");
if (!pending.length && !orphan.length) {
  console.log("全部图片位已就位。");
}

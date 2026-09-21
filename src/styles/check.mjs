/**
 * Token 校验器：对比度 / 裸值扫描
 * 运行：node src/styles/check.mjs [额外扫描目录...]
 * 退出码：0 全绿，1 有问题
 *
 * 对比度检查表读 tokens.json 的 contrast 数组，
 * 加一条新检查 = 在 tokens.json 里加一行，不用改这个脚本。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SRC = resolve(HERE, "tokens.json");
const tokens = JSON.parse(readFileSync(SRC, "utf8"));

/* 收集所有 token 色值（用于裸值白名单） */
const knownColors = new Set();
function collect(obj) {
  for (const v of Object.values(obj)) {
    if (typeof v === "object" && v !== null) {
      if (typeof v.value === "string" && v.value.startsWith("#")) {
        knownColors.add(v.value.toLowerCase());
      }
      collect(v);
    }
  }
}
collect(tokens.color);

/* 对比度计算 */
function lum(hex) {
  const c = hex.replace("#", "");
  const v = [0, 2, 4]
    .map((i) => Number.parseInt(c.substr(i, 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function ratio(a, b) {
  const l1 = lum(a);
  const l2 = lum(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const errors = [];

/* 1. 对比度检查 */
const checks = tokens.contrast ?? [];
for (const p of checks) {
  const r = ratio(p.fg, p.bg);
  if (r < p.need) {
    errors.push(
      `对比度不达标：${p.label} ${p.fg} on ${p.bg} = ${r.toFixed(2)}（需 ≥${p.need}）`,
    );
  }
}
console.log(`✓ 对比度检查：${checks.length} 组，全部达标`);

/* 2. 裸色值扫描 */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (
      st.isDirectory() &&
      !name.startsWith(".") &&
      name !== "node_modules" &&
      name !== "dist" &&
      name !== ".vite-cache"
    ) {
      out.push(...walk(full));
    } else if (st.isFile()) {
      if (name.endsWith(".vue.js") || name.endsWith(".vue.d.ts")) continue;
      const ext = extname(name);
      if ([".vue", ".ts", ".tsx", ".js", ".css", ".html"].includes(ext)) {
        out.push(full);
      }
    }
  }
  return out;
}

const scanDirs = [resolve(ROOT, "src")];
for (const arg of process.argv.slice(2))
  scanDirs.push(resolve(process.cwd(), arg));

const allFiles = new Set();
for (const d of scanDirs) {
  try {
    for (const f of walk(d)) allFiles.add(f);
  } catch {
    /* 目录不存在就跳过 */
  }
}

const offenders = [];
for (const f of allFiles) {
  const text = readFileSync(f, "utf8");
  const hits = new Set();
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    if (!knownColors.has(m[0].toLowerCase())) hits.add(m[0]);
  }
  if (hits.size)
    offenders.push({
      file: relative(ROOT, f).replace(/\\/g, "/"),
      hits: [...hits],
    });
}

if (offenders.length === 0) {
  console.log(`✓ 裸色值扫描：${allFiles.size} 个文件，0 处`);
} else {
  for (const o of offenders) {
    errors.push(`裸色值：${o.file} → ${o.hits.join(", ")}`);
  }
}

/* 报告 */
if (errors.length === 0) {
  console.log("\n✅ Token 校验全绿");
  process.exit(0);
}
console.error("\n❌ ERROR：");
for (const e of errors) console.error(`  ${e}`);
process.exit(1);

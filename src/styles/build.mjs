/**
 * Token 生成器：单一源 tokens.json → CSS 变量（单主题）
 * 运行：node src/styles/build.mjs
 * 产物：src/styles/tokens.css（生成物，勿手改）
 *
 * 设计：单主题。白底为主 + 亮蓝品牌色。
 * 深色只作为「区块」存在（CTA 带 / Footer），不是另一套主题，
 * 所以没有 [data-theme] 分支，深色区块靠 bg-ink / ink-inverse 这组 token 表达。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "tokens.json");
const OUT = resolve(HERE, "tokens.css");

const tokens = JSON.parse(readFileSync(SRC, "utf8"));

function toKebab(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function walk(obj, prefix = "") {
  const lines = [];
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("_")) continue; // 注释字段
    if (Array.isArray(val)) continue; // contrast 检查表不进 CSS
    const name = prefix ? `${prefix}-${toKebab(key)}` : toKebab(key);
    if (typeof val === "object" && val !== null) {
      if ("value" in val) {
        lines.push(`  --${name}: ${val.value};`);
      } else {
        lines.push(...walk(val, name));
      }
    }
  }
  return lines;
}

const vars = walk(tokens);

const css = `/* ⚠️ 生成物，勿手改。改 token 请改 tokens.json，然后跑 node src/styles/build.mjs */
:root {
${vars.join("\n")}
}
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, css, "utf8");
console.log(`✓ 生成 ${OUT}`);
console.log(`  共 ${vars.length} 个变量（单主题）`);

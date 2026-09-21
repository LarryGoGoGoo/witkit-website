/**
 * 生成繁体中文字案表 `src/i18n/tw.ts`。
 *
 * 设计前提（见 src/i18n/index.ts）：
 *   - 中文原文就是 key，所以简体不需要表 —— t() 找不到翻译时原样返回 key
 *   - tw 表 = 把「源码里出现过的所有中文」用 OpenCC cn→tw 转一遍
 *
 * 2026-09-20 起只留简 / 繁两档，英文表 en.ts 已删除 ——
 * 这里不再有 en 覆盖率校验与剪枝，只剩 tw 生成与 --check 同步校验。
 *
 * 用法： node scripts/build-i18n.mjs          （生成 + 校验）
 *        node scripts/build-i18n.mjs --check  （只校验，不写文件）
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as OpenCC from "opencc-js/cn2t";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "../src");
const TW_FILE = join(SRC, "i18n/tw.ts");
const CHECK_ONLY = process.argv.includes("--check");

const CJK = /[\u4e00-\u9fa5]/;

/* ── 1. 收集源码里的中文（剥掉注释，免得把注释里的话也当成文案） ──
 *
 * 顺序很重要：**先配对字符串、再剥注释、最后还原**。
 *
 * 为什么不能直接上正则剥注释：源码里存在以注释符开头的字符串字面量，例如
 * 首屏演示的代码行 `{ text: "// 以科技聚力改变未来 —— 每一行都在线上跑" }`。
 * 直接跑 `//` 那条正则会把引号后面的整段砍掉 —— 这个字符串就成了未闭合状态，
 * 于是**它之后所有引号配对全部错位**（一个 `"` 跟几十行外的另一个 `"` 配成对）。
 * 后果不是报错，而是静默漏收集：`{{ t("公司简介") }}`、`t("行为准则")` 这类
 * 位于其后的 key 全都进不了表，繁体态下永远显示简体。
 * 而且 `--check` 检不出来 —— 生成物与源码「一致地错」，两边一样就算同步。
 *
 * 所以改成：先在**未被破坏的原文**上按引号配对把字符串摘出来（用的就是下面
 * collectLiterals 同款正则），换成占位符；再剥注释；最后把占位符还原。
 * 这样字符串内部的 `//`、`/*`、`<!--` 都不会被误当成注释。 */
function stripComments(src) {
  const guards = [];
  /* 占位符用私有使用区字符（U+E000），不是控制字符 ——
     源码里不可能出现，也不会被 biome 的 noControlCharactersInRegex 拦下。 */
  const guarded = src.replace(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g, (m) => {
    guards.push(m);
    return `\uE000${guards.length - 1}\uE000`;
  });
  const stripped = guarded
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  return stripped.replace(/\uE000(\d+)\uE000/g, (_, i) => guards[Number(i)]);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(vue|ts)$/.test(name) && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/** 混进来的「不是文案」的东西：JS 表达式、对象字面量、带变量的模板串等。
 *  这些翻不翻都没意义，留在表里只会把「漏翻清单」搅浑，所以直接滤掉。
 *  注意保留 `{name}` 这种占位符形式 —— 它是真的文案模板。 */
function isNoise(s) {
  if (s.length > 160) return true;
  if (/[[\]]|=>|\$\{|\{\s*\w+\s*:|\bconst\b|\blet\b|\bfunction\b/.test(s))
    return true;
  if (s.includes(":") && /\{\s*\w/.test(s)) return true;
  return false;
}

/** 有意不翻译的条目：语言自称。
 *  「简 / 繁」在哪种语言下都该显示自己的写法，翻了反而让人认不出，
 *  所以它们既不该出现在漏翻清单里，也不该进 tw 表。 */
const NEVER_TRANSLATE = new Set(["简", "繁"]);

/** 一条「文案」= 一个字符串字面量，或模板里的一段纯文本节点 */
function collectLiterals(raw) {
  const src = stripComments(raw);
  const found = new Set();

  /** 把候选串再拆一层，取出里面真正的字面量。
   *  必要性：Vue 属性写成 :aria-label="t('打开菜单')" 时，
   *  最外层那对双引号会把 `t('打开菜单')` 整块吞成一个「字符串」，
   *  于是一个不存在的 key 就这么混进了表里。这里递归剥到没有引号为止。 */
  function push(s, depth = 0) {
    if (!s) return;
    /* 先剥引号、再判噪音 —— 顺序不能反。
       反过来的话，`:alt="t('{name} 界面截图', { name: p.name })"` 这种写法里，
       整个属性值被外层双引号包成一条「字符串」，里面含有 `{ name:` 于是被 isNoise
       判成噪音**整条丢掉**，连带里面那个真正的 key 一起没了 ——
       表现是漏翻清单里看不到它，英文档下这句话永远是中文（比报错更难发现）。 */
    if (depth < 3 && /["'`]/.test(s)) {
      const inner = [...s.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)];
      if (inner.length) {
        for (const im of inner) {
          push(im[2].replace(/\s*\n\s*/g, " ").trim(), depth + 1);
        }
        return;
      }
    }
    if (isNoise(s)) return;
    if (CJK.test(s)) found.add(s);
  }

  for (const m of src.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
    push(m[2].replace(/\s*\n\s*/g, " ").trim());
  }
  for (const m of src.matchAll(/>([^<>{}]*[\u4e00-\u9fa5][^<>{}]*)</g)) {
    push(m[1].replace(/\s+/g, " ").trim());
  }
  return found;
}

const keyFile = new Map();
for (const f of walk(SRC)) {
  /* 词表自身不算「源码里的文案」—— tw.ts 是这一步的产物，扫它等于自己喂自己。 */
  const isTable = /[\\/]i18n[\\/]tw\.ts$/.test(f);
  if (isTable) continue;
  const rel = relative(SRC, f).replace(/\\/g, "/");
  for (const s of collectLiterals(readFileSync(f, "utf8"))) {
    if (NEVER_TRANSLATE.has(s)) continue;
    if (!keyFile.has(s)) keyFile.set(s, rel);
  }
}
const keys = new Set(keyFile.keys());

/* ── 生成 tw 表 ── */
const convert = OpenCC.Converter({ from: "cn", to: "tw" });
const all = [...keys].sort((a, b) => a.localeCompare(b, "zh"));

const lines = all.map((k) => {
  const tw = convert(k);
  return `  ${JSON.stringify(k)}: ${JSON.stringify(tw)},`;
});

const header = `/**
 * 繁体中文文案表 —— **由 scripts/build-i18n.mjs 自动生成，不要手改**。
 * 来源：把源码里出现过的中文原文用 OpenCC（cn → tw，只转字形、不换词）转一遍。
 * 改文案后跑： node scripts/build-i18n.mjs
 */
const tw: Record<string, string> = {
`;
const footer = `};

export default tw;
`;

const next = `${header}${lines.join("\n")}\n${footer}`;

/* ── 收集器自检：独立于上面的收集逻辑 ──
 *
 * 为什么需要这一段：`--check` 只比对「生成物 vs 源码」，两边跑的是**同一个**收集器，
 * 收集器有 bug 时两边「一致地错」，`--check` 照样报绿。
 * 2026-09-20 就踩过一次：stripComments 把字符串里的 `//` 当注释砍了，
 * 导致其后全文引号配对错位，「公司简介」「行为准则」等 10 条 key 静默漏收集，
 * 繁体态下这四处永远显示简体，而 `--check` 一直说「同步」。
 *
 * 这里换一条完全不同的路子：直接在**原始文本**里搜这些字符串（不剥注释、不做引号配对），
 * 原始文本里有、但收集结果里没有 → 一定是收集器漏了，直接失败。
 * 清单只放几个「稳定且关键」的标题，不用维护全量。 */
const MUST_HAVE = [
  "公司简介",
  "愿景及使命",
  "企业文化",
  "行为准则",
  "联系我们",
];
const rawSources = new Map();
for (const f of walk(SRC)) {
  if (/[\\/]i18n[\\/]tw\.ts$/.test(f)) continue;
  rawSources.set(relative(SRC, f).replace(/\\/g, "/"), readFileSync(f, "utf8"));
}
const missed = [];
for (const k of MUST_HAVE) {
  const inRaw = [...rawSources].filter(([, t]) => t.includes(`"${k}"`));
  if (inRaw.length && !keys.has(k)) {
    missed.push(`${k}（出现在 ${inRaw.map(([f]) => f).join("、")}）`);
  }
}
if (missed.length) {
  console.error("✗ 收集器漏抓了这些 key（原文里有、表里没有）：");
  for (const m of missed) console.error(`    ${m}`);
  console.error("  → 多半是 stripComments 误伤（字符串里含 // 或 /*）。");
  process.exit(1);
}
console.log(`✓ 收集器自检：${MUST_HAVE.length} 个关键 key 均已收集`);

if (CHECK_ONLY) {
  const cur = readFileSync(TW_FILE, "utf8");
  if (cur !== next) {
    console.error(
      "✗ tw.ts 与源码不同步，跑 `node scripts/build-i18n.mjs` 重新生成",
    );
    process.exit(1);
  }
  console.log("✓ tw.ts 与源码同步");
} else {
  writeFileSync(TW_FILE, next, "utf8");
  console.log(`✓ tw.ts 已生成：${all.length} 条`);
}

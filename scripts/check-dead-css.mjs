/**
 * 死 CSS 检查
 *
 * 为的什么：删掉一整块结构（比如「概览」「管理团队」「联系表单」）时，
 * 模板没了，但 <style scoped> 里那几十行样式往往留在原地。
 * 它们不报错、lint 抓不到、build 也不会变小 —— 只是慢慢烂在那里。
 *
 * ── 判据（关键，决定了这个脚本能不能用）──
 * 第一版判据是「类名在本文档的 <template> 里出现过吗」，结果 20 条里 0 条真的，
 * 全是误报。两个原因：
 *   1. `:deep(.ph-file)` —— 目标类名住在子组件里，本文件模板当然找不到
 *   2. `` :class="`is-${size}`" `` —— 类名是运行时拼的，字面量里根本没有 "is-sm"
 * 误报的代价比漏报大得多：报错了没人敢删，这个检查就废了。
 *
 * 所以判据换成「全项目词频」：一个类名如果在整个 src/ 里只出现在**它自己的样式块**
 * 里，那它就是死的 —— 没人引用它。另外给 prop 拼出来的变体类留一条后路：
 * 脚本里出现 `` xxx-${ `` 这样的拼接，就认为 `xxx-*` 命名的类还活着。
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "src");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(vue|ts)$/.test(name)) out.push(p);
  }
  return out;
}

/** 全局样式表也要扫 —— 头一版只扫 .vue 的 <style> 块，
    结果 index.css 里一个模块级工具类（.section-head-center）死了两轮都没人发现。
    .vue 里的 scoped 样式有组件边界帮忙收着，全局表才是真正会烂的地方。 */
function walkCss(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkCss(p, out);
    else if (name.endsWith(".css")) out.push(p);
  }
  return out;
}

const files = [...walk(SRC), ...walkCss(SRC)].sort();

/** 全项目文本，用来数类名出现次数（读一次，别在循环里读） */
const sources = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

/** 「样式区」：.vue 是 <style> 块；.css 整个文件都是。定义处不算引用。 */
function styleRanges(file, src) {
  if (file.endsWith(".css")) return [[0, src.length]];
  const ranges = [];
  for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

/** 某个类名在整个项目里、除了样式块之外，出现过几次 */
function occurrencesOutsideStyle(cls, skipFile, skipRanges) {
  // 边界：类名前后不能是类名字符，避免 .fp-title 命中 .fp-title--sm
  const re = new RegExp(
    `(^|[^A-Za-z0-9_-])${cls.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(?![A-Za-z0-9_-])`,
    "g",
  );
  let n = 0;
  for (const [file, src] of sources) {
    const ranges = file === skipFile ? skipRanges : [];
    for (const m of src.matchAll(re)) {
      const at = m.index + m[0].indexOf(cls);
      if (ranges.some(([a, b]) => at >= a && at < b)) continue;
      n++;
    }
  }
  return n;
}

/** 脚本里有没有 `prefix-${` 这种拼接（说明 prefix-* 系列是 prop 驱动的） */
function hasVariantInterpolation(src, prefix) {
  return src.includes(`${prefix}-\${`);
}

/** 模板里有没有 `<Transition name="xxx">` —— Vue 会在运行时挂载
    xxx-enter-active / xxx-leave-active / xxx-enter-from / xxx-leave-to 等类名，
    静态扫描不到它们，但它们是活的。收集这些 name 前缀。 */
function transitionPrefixes(src) {
  const out = new Set();
  for (const m of src.matchAll(/<Transition\b[^>]*name="([^"]+)"/g)) {
    out.add(m[1]);
  }
  return out;
}

console.log(`扫描 ${files.length} 个源文件\n`);

let deadTotal = 0;
let fileCount = 0;

for (const file of files) {
  const src = sources.get(file);
  const ranges = styleRanges(file, src);
  if (!ranges.length) continue;
  // 只有 .vue 才有模板；.css 文件没有模板，靠全项目词频判就够了
  const isVue = file.endsWith(".vue");
  const transitions = isVue ? transitionPrefixes(src) : new Set();

  // 收集本文档样式块里定义过的类名 + 出现行号
  const defined = new Map();
  for (const [a, b] of ranges) {
    const raw = src.slice(a, b);
    const lineBase = src.slice(0, a).split("\n").length;
    /* 先整块剥注释，再按行切 —— 顺序不能反。
       按行剥的话，跨行的块注释里的类名会被当成真定义：
       本文件就踩过这个坑 —— 注释里写着「曾经有一个 .section-head-center」，
       于是这个早删掉的类每次都被报成「定义在第 107 行」，看着像没删干净。
       注释里提到类名是常态（要说明为什么删），这个假阳性必须堵掉。 */
    const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "");
    stripped.split("\n").forEach((line, i) => {
      /* 先挖掉「值」再找选择器 —— 顺序不能反。
         `hero-grain` 的颗粒噪点是一段 SVG data URI，里面带 `www.w3.org` 这个域名，
         类名正则会从中切出 `.w3` 和 `.org` 两个「类名」，于是每次 check:css 都报
         「HomePage.vue 有 2 个类名无人引用」，看着像 CSS 没删干净，其实根本没这俩类。
         url(...) 与引号里的内容都是**属性值**，CSS 选择器不可能出现在里面，
         先剥掉就不会再切出域名碎片。按行处理是为了不动行号。 */
      const code = line
        .replace(/^\s*\/\/.*/, "")
        .replace(/url\([^)]*\)/gi, "url()")
        .replace(/(["'])(?:\\.|(?!\1)[\s\S])*?\1/g, "");
      for (const m of code.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)) {
        const c = m[1];
        if (!defined.has(c)) defined.set(c, []);
        defined.get(c).push(lineBase + i);
      }
    });
  }

  const dead = [];
  for (const [cls, lines] of defined) {
    // 修饰符类（BEM 的 --sm / __part）单独处理：它们总是跟主类一起写，
    // 单独判死会误报 —— 主类活着，修饰符就活着。
    if (cls.includes("--") || cls.includes("__")) continue;

    if (occurrencesOutsideStyle(cls, file, ranges) > 0) continue;

    // prop 拼出来的变体：本文件脚本里有 `is-${` 这类拼接就当它活着
    // （只有 .vue 才可能是拼接出来的；.css 里没有运行时）
    if (isVue && hasVariantInterpolation(src, cls.split("-")[0])) continue;

    // Vue <Transition name="xxx"> 派生的 xxx-enter-active 等类名是运行时挂载的
    if (isVue && [...transitions].some((p) => cls.startsWith(`${p}-`)))
      continue;

    dead.push({ cls, lines });
  }

  if (dead.length) {
    fileCount++;
    deadTotal += dead.length;
    console.log(`── ${relative(SRC, file)}`);
    for (const d of dead)
      console.log(`   .${d.cls}  (第 ${d.lines.join(", ")} 行)`);
    console.log("");
  }
}

console.log(
  deadTotal
    ? `⚠️  ${fileCount} 个文件里共 ${deadTotal} 个类名无人引用。逐条 grep 确认后删掉。`
    : "✅ 没有死 CSS：样式里定义的类名全都能在项目里找到引用",
);

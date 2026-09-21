/**
 * 从 imageSpecs.json 生成《图片需求清单.md》
 *
 * 为什么生成而不是手写：
 *   规格表是唯一源，文档是它的投影。手写的后果是改了规格忘了改文档，
 *   最后两张表互相矛盾，谁也不知道该信哪个。
 *   跑 `npm run docs:images` 重新生成即可。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const { slots } = JSON.parse(
  readFileSync(resolve(ROOT, "src/assets/imageSpecs.json"), "utf8"),
);

const managed = slots.filter((s) => !s.external && !s.unused);
const unused = slots.filter((s) => !s.external && s.unused);
const external = slots.filter((s) => s.external);

const ORDER = ["必做", "建议", "可选"];
const GROUP_TITLE = {
  必做: "必做 · 影响第一眼观感",
  建议: "建议 · 页面更「有东西」",
  可选: "可选 · 上线前补或不补都行",
};

function table(rows) {
  const head =
    "| 文件名 | 放哪 | 尺寸 | 比例 | 内容要求 |\n|---|---|---|---|---|";
  const body = rows
    .map(
      (s) =>
        `| \`${s.slot}\` | ${s.where} | ${s.px} | ${s.ratio.replace(" / ", ":")} | ${s.content} |`,
    )
    .join("\n");
  return `${head}\n${body}`;
}

const lines = [];

lines.push("# witkit 妙计科技官网 · 图片需求清单");
lines.push("");
lines.push(
  "> 这份文件由 `src/assets/imageSpecs.json` 自动生成，不要手改。" +
    "改规格请改那个 json，然后跑 `npm run docs:images`。",
);
lines.push("");
lines.push(
  "做好的图丢进 `src/assets/images/` 对应位置，**文件名对上就自动生效**，" +
    "不用改代码、不用改配置，刷新即出。",
);
lines.push("");
lines.push(
  `**没做的图不会报错、不会裂图** —— 页面用工程图纸风格的占位框兜住，框里直接写着这张图要什么。可以分批补。当前共 ${managed.length} 个站内图片位 + ${external.length} 个 public 文件。`,
);
if (unused.length) {
  lines.push("");
  lines.push(
    `另有 ${unused.length} 位规格保留、**当前页面没有任何地方引用**（用到的板块已经删除），不计入上面这个数：${unused
      .map((s) => `\`${s.slot}\``)
      .join("、")}。以后要重做产品矩阵 / 实验室那类版式，可以直接拿来用。`,
  );
}
lines.push("");
lines.push("随时查进度：`npm run check:images`");
lines.push("");
lines.push("---");
lines.push("");

for (const p of ORDER) {
  const rows = managed.filter((s) => s.priority === p);
  if (!rows.length) continue;
  lines.push(`## ${GROUP_TITLE[p]}`);
  lines.push("");
  lines.push(table(rows));
  lines.push("");
}

lines.push("## public/ 下的文件（不走 src/assets）");
lines.push("");
lines.push("| 文件 | 放哪 | 尺寸 | 内容要求 |");
lines.push("|---|---|---|---|");
for (const s of external) {
  lines.push(`| \`${s.publicPath}\` | ${s.where} | ${s.px} | ${s.content} |`);
}
lines.push("");
lines.push(
  "> 这两个文件放在 `public/` 根目录。favicon 换好后，把 `index.html` 里" +
    " `apple-touch-icon` 那行的注释打开；og 封面同理。",
);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## 通用规范");
lines.push("");
lines.push("| 项 | 要求 |");
lines.push("|---|---|");
lines.push(
  "| 命名 | **全小写 + 连字符**，不用中文、不用空格、不加 `@2x` 后缀 |",
);
lines.push(
  "| 扩展名 | `png` / `jpg` / `jpeg` / `webp` / `avif` / `svg` 都行，代码按同名匹配，不看扩展名 |",
);
lines.push(
  "| 分辨率 | 一律按 **2x** 出图（显示 1440 宽的，出 2880），高清屏不糊 |",
);
lines.push("| 体积 | 单张 **< 300KB**。PNG 用 tinypng 压，照片转 WebP |");
lines.push(
  "| 截图 | 用**真实界面**，浅色主题，和官网白底一致；真实邮箱、密钥、Token 必须打码 |",
);
lines.push("| 版权 | 必须是自有素材或已授权，别用网上随手存的图 |");
lines.push("");
lines.push("## 为什么不用 public/images/");
lines.push("");
lines.push(
  "1. **没做的图不会产生 404 请求**。构建期就确定哪些图存在，不存在的直接渲染占位框，控制台一个报错都没有。",
);
lines.push(
  "2. Vite 会给每张图加内容指纹，浏览器缓存可以永久有效，改图后用户必然拿到新版。",
);
lines.push("");
lines.push("## 当前页面上能看到这些占位框的位置");
lines.push("");
lines.push(
  "> 这张表按页面实际引用的图片位写，改版式时如果动了图片位，记得一起改（脚本里就是几行字符串）。",
);
lines.push("");
lines.push("| 页面 | 图片位 |");
lines.push("|---|---|");
lines.push(
  "| 首页 `/`（＝关于我们） | 首屏纯黑底无配图（2026-09-20 起不用图片）、公司简介配图 ×1、愿景配图 ×1、企业文化背景 ×4（一屏只显示当前那条） |",
);
lines.push("| 我们的服务 `/services` | 体系总览图 ×1、三大体系图 ×3 |");
lines.push(
  "| 我们的产品 `/products` | 核心产品卡 ×7、组合说明图 ×1（复用服务页总览图） |",
);
lines.push(
  "| 新闻动态 `/news` | 每条动态一张封面（还没有稿件，所以现在页面里 0 个占位框） |",
);
lines.push(
  "| 加入我们 | 已并入「联系我们」锚点（/careers 页已删除，办公环境图与三联图不再使用） |",
);
lines.push("");

writeFileSync(resolve(ROOT, "图片需求清单.md"), lines.join("\n"), "utf8");
console.log(
  `✓ 已生成 图片需求清单.md（${managed.length} 个站内图片位 + ${external.length} 个 public 文件）`,
);

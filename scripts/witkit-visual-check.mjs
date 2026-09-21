/**
 * witkit 官网渲染自检（跑在 workflow-demo 里，因为 playwright 装在这边）
 *
 * 它检查的是「第 2 步 生成界面」的过关条件里，肉眼之外的那两条：
 *   1. 零 console 报错 / 零未捕获异常 —— 包括图片位没图时不能有 404
 *   2. 各页首屏不横向溢出（三档宽度都验）
 * 顺便把每页整页截图落到 .shots/，方便人眼过一遍排版。
 *
 * 跑法：node scripts/witkit-visual-check.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.WITKIT_BASE ?? "http://127.0.0.1:5300";
const OUT =
  process.env.WITKIT_SHOTS ??
  resolve(dirname(fileURLToPath(import.meta.url)), "../.shots");

/* 首页就是「关于我们」，所以这里不再单列 about —— /about 只是跳回 / 的老地址。
   新闻详情页（/news/:slug）也不列了：编造的内容已全部删除，没有 slug 可测，
   硬测会必然拿到 404（等真实稿件来了再把它加回来）。
   /careers 也已删（加入我们直接跳首页联系我们锚点），不列。 */
const PAGES = [
  ["home", "/"],
  ["services", "/services"],
  ["products", "/products"],
  ["developers", "/developers"],
  ["news", "/news"],
  ["tech-hec", "/tech/hec"],
  ["product-ide", "/product/ide"],
];

const VIEWPORTS = [
  ["desktop", 1440, 900],
  ["laptop", 1180, 800],
  ["mobile", 390, 844],
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

for (const [vpName, width, height] of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  for (const [name, path] of PAGES) {
    const page = await context.newPage();
    const noise = [];

    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") {
        noise.push(`[console.${m.type()}] ${m.text()}`);
      }
    });
    page.on("pageerror", (e) => noise.push(`[pageerror] ${e.message}`));
    page.on("requestfailed", (r) =>
      noise.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText ?? ""}`),
    );
    page.on("response", (r) => {
      if (r.status() >= 400) noise.push(`[http ${r.status()}] ${r.url()}`);
    });

    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    /* 横向溢出：真实渲染宽度超出视口就是排版事故 */
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );

    /* 图片位与占位框分开数。
       原来这里只数 .slot（图片位总数）却标成「占位框」，图补上以后这个数不会变，
       看日志的人会以为图一直没进去。现在两个都报：
       · 图片位 = .slot 数量（排版里预留了几张图）
       · 占位 = .ph 数量（还没补的，图到位后应当逐个掉到 0） */
    const slotCount = await page.locator(".slot").count();
    const phCount = await page.locator(".ph").count();

    const visibleText = (
      await page
        .locator("main")
        .innerText()
        .catch(() => "")
    ).trim().length;

    if (overflow > 1) problems.push(`${vpName} ${path} 横向溢出 ${overflow}px`);
    if (noise.length)
      problems.push(`${vpName} ${path} :: ${noise.join(" | ")}`);
    if (!visibleText) problems.push(`${vpName} ${path} 主内容为空`);

    console.log(
      `  ${vpName.padEnd(8)} ${path.padEnd(26)} 溢出 ${String(overflow).padStart(3)}px  图片位 ${String(slotCount).padStart(2)} · 占位 ${String(phCount).padStart(2)}  文字 ${visibleText}  ${noise.length ? `⚠ ${noise.length}` : "✓"}`,
    );

    if (vpName === "desktop") {
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    }

    await page.close();
  }

  await context.close();
}

await browser.close();

console.log("");
if (problems.length) {
  console.error("发现问题：");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`全部通过。整页截图在 ${OUT}`);

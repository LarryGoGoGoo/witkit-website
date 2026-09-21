/**
 * 滚动位置验收：浏览器返回 / 前进 / hash 锚点 / 首次进入
 *
 * ── 为什么要有这个脚本 ──
 * 2026-09-20 用户报：「点击这三个服务对应界面会跳转到对应介绍界面，
 * 但是点击浏览器返回按钮回来时，默认就回到了我们的服务的最底部。」
 *
 * 实测（1440×900）：/services 滚到 HEC 那条「查看 HEC 技术细节 →」（scrollY=2175）
 * → 点进 /tech/hec → 浏览器返回，落点 4561（已贴近页面底部），偏了 2386px。
 *
 * 根因**不在 vue-router** —— 它确实调了 scrollTo({top: 2175})，目标是对的。
 * 是**浏览器的滚动锚定（scroll anchoring）**：
 * 各页 onMounted 里都是 `await api.xxx()`，即使数据就在本地、只晚一个微任务，
 * 首帧照样先渲染「正在加载…」的矮页面（文档 3781 高）。
 * vue-router 就在这个矮页面上定位了；等数据到位、文档长到 6167（+2386），
 * 锚定为了「保持视口里正在看的内容不动」，把滚动位置也推了 +2386。
 * **两个 2386 一模一样，就是锚定的签名。**
 *
 * 修法（src/router.ts）：恢复位置前先等文档高度连续两帧不变（whenStable），
 * 锚定就没有可推的余地。首次进入不走这个等待，不拖慢首次加载。
 *
 * ── 为什么每条用例都用全新 context ──
 * 最初把 10 条用例串在一个 page 里跑，hec 那条报偏 -448px、uef/cep 却是 0px。
 * 单独复跑 hec 又是 0px —— 是**测试间互相污染**（上一轮的 goto 干扰了下一轮的
 * history 状态），不是产品 bug。**每条独立 context 才是可信的。**
 *
 * 用法：npm run check:scroll（需 dev server 在 127.0.0.1:5300）
 */
import { chromium } from "playwright";

const BASE = process.env.WITKIT_BASE ?? "http://127.0.0.1:5300";
const TOLERANCE = 2; // px，允许的落点误差

let pass = 0;
let fail = 0;
const failures = [];

function chk(ok, label, detail) {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  ${detail}` : ""}`);
  if (ok) pass++;
  else {
    fail++;
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const browser = await chromium.launch();

/** 每条用例一套独立 context，避免 history/滚动状态互相污染 */
async function fresh() {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  return { ctx, page: await ctx.newPage() };
}

const y = (page) => page.evaluate(() => Math.round(window.scrollY));

/* ── 1. 服务页三条「查看 XX 技术细节 →」：跳转后返回，落点必须精确 ── */
for (const slug of ["hec", "uef", "cep"]) {
  const { ctx, page } = await fresh();
  await page.goto(`${BASE}/services`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const link = page.locator(`a[href="/tech/${slug}"].system-link`).first();
  await link.waitFor({ state: "attached", timeout: 10000 });
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const y0 = await y(page);

  await link.click();
  /* ⚠️ 一律 waitForURL，别用固定 waitForTimeout 等导航 ——
     导航中页面上下文会被销毁，此时 evaluate 抛
     「Execution context was destroyed」。（这个坑真踩过：13 条里第 13 条偶发挂掉） */
  await page.waitForURL(`**/tech/${slug}**`, { timeout: 10000 });
  await page.waitForTimeout(500);
  const onTech = await page.evaluate(() => location.pathname);

  await page.goBack();
  await page.waitForURL("**/services**", { timeout: 10000 });
  await page.waitForTimeout(900);
  const y1 = await y(page);

  chk(
    onTech === `/tech/${slug}` && Math.abs(y1 - y0) <= TOLERANCE,
    `${slug}：跳转 /tech/${slug} 后返回落点`,
    `y0=${y0} y1=${y1} 偏 ${y1 - y0}px`,
  );
  await ctx.close();
}

/* ── 2. 体系标题链接（另一条入口，滚动深度不同）── */
for (const [slug, label] of [
  ["uef", "UEF 标题链接（中段）"],
  ["cep", "CEP 标题链接（接近底部）"],
]) {
  const { ctx, page } = await fresh();
  await page.goto(`${BASE}/services`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const link = page
    .locator(`main a[href="/tech/${slug}"].system-title-link`)
    .first();
  await link.waitFor({ state: "attached", timeout: 10000 });
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const y0 = await y(page);

  await link.click();
  await page.waitForURL(`**/tech/${slug}**`, { timeout: 10000 });
  await page.goBack();
  await page.waitForURL("**/services**", { timeout: 10000 });
  await page.waitForTimeout(900);
  const y1 = await y(page);

  chk(
    Math.abs(y1 - y0) <= TOLERANCE,
    `${label} 返回落点`,
    `y0=${y0} y1=${y1} 偏 ${y1 - y0}px`,
  );
  await ctx.close();
}

/* ── 3. hash 锚点：仍须瞬时定位、落点精确（top:88 避开固定顶栏）── */
{
  const { ctx, page } = await fresh();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    [...document.querySelectorAll("a")]
      .find((a) => a.getAttribute("href") === "/#contact")
      ?.click();
  });
  await page.waitForTimeout(900);
  const a = await page.evaluate(() => {
    const el = document.getElementById("contact");
    return {
      hash: location.hash,
      top: el ? Math.round(el.getBoundingClientRect().top) : null,
    };
  });
  chk(
    a.hash === "#contact" && a.top !== null && Math.abs(a.top - 88) <= 4,
    "hash 锚点 /#contact 瞬时定位",
    `#contact 距顶 ${a.top}px（期望 88）`,
  );
  await ctx.close();
}

/* ── 4. 首次进入各页停在顶部（whenStable 不该拖慢或错位）── */
for (const p of [
  "/services",
  "/products",
  "/developers",
  "/news",
  "/tech/hec",
]) {
  const { ctx, page } = await fresh();
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const y1 = await y(page);
  chk(y1 === 0, `首次进入 ${p} 停在顶部`, `scrollY=${y1}`);
  await ctx.close();
}

/* ── 5. 多级后退 + 前进 ── */
{
  const { ctx, page } = await fresh();
  await page.goto(`${BASE}/services`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(600);
  const s = await y(page);

  await page.goto(`${BASE}/news`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  await page.goBack();
  /* ⚠️ 别用固定 waitForTimeout 等导航 —— 前进/后退期间页面上下文会被销毁，
     这时候 evaluate 会抛「Execution context was destroyed」。
     等 URL 真的变成目标值再读。 */
  await page.waitForURL("**/services**", { timeout: 10000 });
  await page.waitForTimeout(900);
  const b = await page.evaluate(() => ({
    path: location.pathname,
    y: Math.round(window.scrollY),
  }));
  chk(
    b.path === "/services" && Math.abs(b.y - s) <= TOLERANCE,
    "多级后退 /news → /services",
    `回到 ${b.path} scrollY=${b.y}（期望 ${s}）`,
  );

  await page.goForward();
  await page.waitForURL("**/news**", { timeout: 10000 });
  await page.waitForTimeout(900);
  const f = await page.evaluate(() => location.pathname);
  chk(f === "/news", "前进按钮回到 /news", `落在 ${f}`);
  await ctx.close();
}

await browser.close();

console.log(
  `\n${fail === 0 ? "✅ 滚动位置全部通过" : `❌ ${fail} 条失败`}（${pass}/${pass + fail}）`,
);
if (fail) {
  console.log("\n失败明细：");
  for (const f of failures) console.log(`  · ${f}`);
}
process.exit(fail === 0 ? 0 : 1);

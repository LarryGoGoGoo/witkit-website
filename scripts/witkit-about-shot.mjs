/**
 * 关于我们（＝首页）专项截图（逐块留证）。
 *
 * 为什么要单独截：这一页用了 v-reveal 滚动显现，
 * fullPage 截图会把没滚到的区块拍成空白，肉眼看不出实际效果。
 * 这里逐个滚到目标位置、等显现动画跑完，再拍整屏。
 *
 * 注意：关于我们就是首页（/），老地址 /about 只是跳转，所以这里走 /。
 *
 *   node scripts/witkit-about-shot.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.WITKIT_BASE ?? "http://127.0.0.1:5300";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../.shots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);

/* 顶栏是固定定位，滚到区块顶部时它会盖住一点内容 —— 普通区块多留 20px 让标题露全。
   整屏页（.fp）例外：它本来就该顶到视口最上面，留 120px 反而会拍进上一块的尾巴。 */
async function shot(name, target) {
  if (typeof target === "string") {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const offset = el.classList.contains("fp") ? 0 : 120;
      window.scrollTo({
        top: window.scrollY + el.getBoundingClientRect().top - offset,
      });
    }, target);
  } else {
    await page.evaluate((y) => window.scrollTo({ top: y }), target);
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${name}.png`);
}

/* 首屏：只有一行大字（入口索引已按用户要求删除，大字下面直接进公司简介） */
await shot("about-top", 0);
/* 方案：公司简介 / 愿景及使命 图与字分开摆 */
await shot("about-company", "#company");
await shot("about-vision", "#vision");
/* 企业文化：唯一「整页背景 + 字压在图上」的一页，且可翻页（翻页只换字，位置不动） */
await shot("about-culture", "#culture");
/* 翻一条：确认内容真的在切 */
await page.locator(".culture-nav .cn-btn").nth(1).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/about-culture-02.png` });
console.log("✓ about-culture-02.png");
await page.locator(".culture-nav .cn-btn").nth(1).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/about-culture-03.png` });
console.log("✓ about-culture-03.png");
/* 行为准则 */
await shot("about-conduct", "#conduct");
/* 联系我们（只有通道，没有表单） */
await shot("about-contact", "#contact");

await browser.close();

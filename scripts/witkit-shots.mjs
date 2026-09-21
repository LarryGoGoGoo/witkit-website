/** 首屏与体系区块的目视截图（1440×900 真实视口） */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.WITKIT_BASE ?? "http://127.0.0.1:5300";
const OUT =
  process.env.WITKIT_SHOTS ??
  resolve(dirname(fileURLToPath(import.meta.url)), "../.shots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(path, file, scrollTo = 0) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  if (scrollTo) {
    for (let y = 0; y <= scrollTo; y += 150) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(30);
    }
  }
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${file}.png` });
  await page.close();
}

/* 首页 ＝ 关于我们：首屏是那行大字，下面逐块截图交给 witkit-about-shot.mjs
   （它用选择器精确滚到 #company / #vision / #culture 等，比这里写死像素稳）。 */
await shot("/", "hero-1440");
await shot("/services", "services-top");
console.log("已截图：hero-1440 / services-top");
await browser.close();

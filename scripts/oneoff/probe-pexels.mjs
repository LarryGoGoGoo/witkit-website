import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto("https://www.pexels.com/zh-cn/search/technology/", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForTimeout(15000); // 等 Cloudflare 挑战 + 图片加载
  const title = await page.title();
  console.log("TITLE:", title);
  const ids = await page.evaluate(() => {
    const set = new Set();
    for (const img of document.querySelectorAll("img")) {
      const src = img.currentSrc || img.src || "";
      const m = src.match(/pexels-photo-(\d+)/);
      if (m) set.add(m[1]);
    }
    for (const a of document.querySelectorAll("a[href*='/photo/']")) {
      const m = a.href.match(/\/photo\/[^/]+-(\d+)\//);
      if (m) set.add(m[1]);
    }
    return [...set];
  });
  console.log("PHOTO_IDS_FOUND:", ids.length);
  console.log(ids.slice(0, 30).join(","));
} catch (e) {
  console.log("ERROR:", e.message);
}
await browser.close();

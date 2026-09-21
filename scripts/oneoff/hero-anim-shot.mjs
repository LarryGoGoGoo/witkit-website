// 首屏动画截图：验证分步动画各阶段 + 最终定格
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = "http://127.0.0.1:5300/";
const outDir = ".shots/hero-anim";

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 抓 console 错误
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

// 阶段 1：刚加载（全黑，字还没浮现）
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/1-开场全黑.png` });

// 阶段 2：字浮现中（约 800ms，淡入进行中）
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/2-字浮现.png` });

// 阶段 3：字定格（约 1500ms，最终定格）
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}/3-定格.png` });

// 检查首屏关键元素
const info = await page.evaluate(() => {
  const hero = document.querySelector(".hero");
  const title = document.querySelector(".hero-title");
  const glow = document.querySelector(".hero-glow");
  const classes = hero ? hero.className : "";
  const titleRect = title ? title.getBoundingClientRect() : null;
  const opacity = title ? getComputedStyle(title).opacity : "?";
  return {
    heroClasses: classes,
    titleText: title?.textContent?.trim() ?? "",
    titleOpacity: opacity,
    titleRect: titleRect
      ? {
          x: Math.round(titleRect.x),
          y: Math.round(titleRect.y),
          w: Math.round(titleRect.width),
          h: Math.round(titleRect.height),
        }
      : null,
    hasGlow: !!glow,
    hasWordImg: !!document.querySelector(".hero-word"),
    hasBgImg: !!document.querySelector(".hero-bg"),
  };
});

console.log(JSON.stringify({ info, errors }, null, 2));

await browser.close();
console.log("DONE");

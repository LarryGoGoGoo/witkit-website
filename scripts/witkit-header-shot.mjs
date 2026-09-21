/**
 * 顶栏专项截图：静止态 / 通栏 Mega 面板两态 / 下滑隐藏后再上滑
 * 只为肉眼验收顶栏，不参与过关判定。
 */
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
const page = await browser.newPage({ viewport: { width: 1440, height: 620 } });

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/header-top.png` });

/* 展开两个通栏面板，各截一张，并量出面板实际几何。
   断言三件事：①面板左右两边贴住视口（通栏）；
   ②面板内容区与顶栏内容区同宽对齐；③面板真的打开了（visibility/opacity）。 */
const panels = [];
for (const [idx, name] of [
  [0, "service"],
  [1, "product"],
]) {
  await page.locator(".nav-desktop .nav-item").nth(idx).hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/header-mega-${name}.png` });

  panels.push(
    await page.evaluate((name) => {
      const el = document.querySelector(".mega.open");
      if (!el) return { panel: name, missing: true };
      const r = el.getBoundingClientRect();
      const headerInner = document
        .querySelector(".header-inner")
        ?.getBoundingClientRect();
      const megaInner = el
        .querySelector(".mega-inner")
        ?.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        panel: name,
        width: Math.round(r.width),
        height: Math.round(r.height),
        left: Math.round(r.left),
        right: Math.round(r.right),
        viewport: window.innerWidth,
        fullBleed: r.left <= 0 && Math.abs(r.right - window.innerWidth) <= 1,
        visible: cs.visibility === "visible" && cs.opacity === "1",
        contentAligned:
          !!headerInner &&
          !!megaInner &&
          Math.abs(headerInner.left - megaInner.left) <= 1 &&
          Math.abs(headerInner.right - megaInner.right) <= 1,
      };
    }, name),
  );
}
await page.mouse.move(20, 400);
await page.waitForTimeout(300);

/* 往下滚 → 顶栏应当滑出视口（截一张，视觉上应该是没有顶栏的） */
await page.evaluate(() => window.scrollTo(0, 1600));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/header-hidden.png` });

/* 往上滚 → 顶栏应当回来 */
await page.evaluate(() => window.scrollTo(0, 1200));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/header-returned.png` });

const state = await page.evaluate(() => {
  const h = document.querySelector("header");
  const inner = h?.querySelector(".header-inner");
  const img = h?.querySelector(".logo-img");
  const links = [...(h?.querySelectorAll(".nav-desktop .nav-link") ?? [])];

  /* 相邻导航项之间的实际空隙：量文字到文字的间距，用来证明导航条铺得够开 */
  const gaps = [];
  for (let i = 1; i < links.length; i++) {
    const a = links[i - 1].getBoundingClientRect();
    const b = links[i].getBoundingClientRect();
    gaps.push(Math.round(b.left - a.right));
  }

  const innerRect = inner?.getBoundingClientRect();
  return {
    classes: h?.className ?? "",
    height: h?.getBoundingClientRect().height ?? 0,
    top: h?.getBoundingClientRect().top ?? 0,
    navLabels: links.map((a) => a.textContent?.trim()),
    logo: img
      ? {
          loaded: img.complete && img.naturalWidth > 0,
          rendered: `${Math.round(img.getBoundingClientRect().width)}×${Math.round(img.getBoundingClientRect().height)}`,
          natural: `${img.naturalWidth}×${img.naturalHeight}`,
        }
      : { loaded: false, note: "还在用内联兜底标" },
    navItemGaps: gaps,
    /* 顶栏内容区左右内边距：内容边缘到视口的距离 */
    sideInset: innerRect
      ? `${Math.round(innerRect.left + Number.parseFloat(getComputedStyle(inner).paddingLeft))}px`
      : null,
    headerWidth: innerRect?.width,
  };
});

console.log(JSON.stringify({ ...state, panels }, null, 2));
await browser.close();

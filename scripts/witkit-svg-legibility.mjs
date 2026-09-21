/**
 * 像素级验证：把 SVG 按「实际显示尺寸」光栅化，量每个 <text> 区域的最暗像素。
 *
 * 判据：最暗像素 > 120 说明这个字在屏幕上已经糊到看不清；
 *       修复前 uef/cep 的芯片标签就在这个区间。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(process.cwd(), "src/assets/images");
const FILES = [
  "systems/uef.svg",
  "systems/cep.svg",
  "systems/hec.svg",
  "services/overview.svg",
];
const DISPLAY_W = 823; // 1440 视口下 /services 上的实际显示宽度

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

const summary = {};
for (const f of FILES) {
  const svgText = readFileSync(resolve(ROOT, f), "utf8");
  /* 用 HTML 包一层：直接以 image/svg+xml 打开时 document 是 SVG 文档，
     createElement("canvas") 拿不到真正的 canvas。 */
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><body style="margin:0">${svgText}</body>`,
    { waitUntil: "load" },
  );
  await page.waitForTimeout(200);

  const out = await page.evaluate(async (displayW) => {
    const svg = document.querySelector("svg");
    const vb = svg.viewBox.baseVal;
    const scale = displayW / vb.width;
    const displayH = vb.height * scale;

    /* 先把每个 text 的 bbox 与样式取出来（光栅化之前，避免 clone 后丢失） */
    const items = [...svg.querySelectorAll("text")].map((t) => {
      const b = t.getBBox();
      const cs = getComputedStyle(t);
      return {
        text: (t.textContent ?? "").slice(0, 18),
        fill: cs.fill,
        stroke: cs.stroke,
        x: b.x,
        y: b.y,
        w: b.width,
        h: b.height,
      };
    });

    const clone = svg.cloneNode(true);
    clone.setAttribute("width", String(displayW));
    clone.setAttribute("height", String(displayH));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });

    const cv = document.createElement("canvas");
    cv.width = displayW;
    cv.height = Math.round(displayH);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);

    const rows = [];
    for (const it of items) {
      const x = Math.max(0, Math.floor(it.x * scale));
      const y = Math.max(0, Math.floor(it.y * scale));
      const w = Math.min(cv.width - x, Math.ceil(it.w * scale));
      const h = Math.min(cv.height - y, Math.ceil(it.h * scale));
      if (w < 2 || h < 2) continue;
      const d = ctx.getImageData(x, y, w, h).data;
      let min = 255;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum < min) min = lum;
        sum += lum;
        n++;
      }
      rows.push({
        text: it.text,
        fill: it.fill,
        stroke: it.stroke,
        minLum: Math.round(min),
        avgLum: Math.round(sum / n),
      });
    }
    return { scale: +scale.toFixed(3), rows };
  }, DISPLAY_W);

  const bad = out.rows.filter((r) => r.minLum > 120);
  const soft = out.rows.filter((r) => r.minLum > 80 && r.minLum <= 120);
  const stroked = out.rows.filter((r) => r.stroke !== "none");

  console.log(`\n########## ${f}   缩放 ${out.scale}`);
  console.log(
    `  text 总数 ${out.rows.length}｜仍带 stroke 的 ${stroked.length}｜糊（最暗>120）${bad.length}｜偏灰(80~120) ${soft.length}`,
  );
  for (const r of [...bad, ...soft].slice(0, 12)) {
    console.log(
      `    ${r.text.padEnd(20)} fill=${r.fill.padEnd(18)} stroke=${r.stroke.padEnd(18)} 最暗=${r.minLum}`,
    );
  }
  summary[f] = {
    total: out.rows.length,
    stroked: stroked.length,
    bad: bad.length,
    soft: soft.length,
  };
}

writeFileSync(
  resolve(process.cwd(), ".shots/_probe/text-legibility.json"),
  JSON.stringify(summary, null, 2),
);

await browser.close();
console.log("\n=== 汇总 ===");
console.log(JSON.stringify(summary, null, 2));

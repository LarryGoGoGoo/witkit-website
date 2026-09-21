/**
 * 像素级验证：把 SVG 按「实际显示尺寸」光栅化，量每个 <text> 区域的最暗像素。
 *
 * 判据：最暗像素 > 120 说明这个字在屏幕上已经糊到看不清；
 *       修复前 uef/cep 的芯片标签就在这个区间。
 *
 * ⚠️ 每张图的显示宽度是不一样的，必须分开给。早先这里写死 823 对所有图一视同仁，
 *    结果把通栏的 overview.svg（实际满宽）也按 823 算，报出一堆假阳性。
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

/* 每张图在页面上的实际显示宽度（px），Playwright 实测。
   取 1366 视口（常见笔记本下限）而不是 1440，宁可低估不高估。
   · systems/*.svg 在 /services 的图列里（栅格 2.4fr : 1fr，容器 1400）→ 887px@1440，约 840px@1366
   · services/overview.svg 是页面顶部通栏图，宽度≈视口宽 → 1440px@1440，取 1366
   ⚠️ 改了 /services 的栅格比例或容器宽度，这几个数得重新实测，否则结论整体偏移。 */
const DISPLAY_W = {
  "systems/uef.svg": 840,
  "systems/cep.svg": 840,
  "systems/hec.svg": 840,
  "services/overview.svg": 1366,
};

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
    /* fill 色的理论亮度。后面拿它跟实测最暗像素比：
       笔画够粗够清晰时，最暗像素应该正好落在 fill 色附近；
       被抗锯齿糊掉或半透明叠加时，最暗像素会明显偏亮（往白底方向跑）。 */
    const lumOf = (css) => {
      const m = css.match(/\d+/g);
      if (!m || m.length < 3) return 0;
      return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
    };

    const items = [...svg.querySelectorAll("text")].map((t) => {
      const b = t.getBBox();
      const cs = getComputedStyle(t);
      return {
        text: (t.textContent ?? "").slice(0, 18),
        fill: cs.fill,
        fillLum: Math.round(lumOf(cs.fill)),
        stroke: cs.stroke,
        fontSize: Number.parseFloat(cs.fontSize) || 0,
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
        fillLum: it.fillLum,
        stroke: it.stroke,
        fontSize: Math.round(it.fontSize * 10) / 10,
        /* 这个字在读者屏幕上实际占多少 px —— 比画布字号更能说明问题 */
        screenPx: Math.round(it.fontSize * scale * 10) / 10,
        minLum: Math.round(min),
        avgLum: Math.round(sum / n),
      });
    }
    return { scale: +scale.toFixed(3), rows };
  }, DISPLAY_W[f]);

  /* 判据：实测最暗像素比该字的理论色亮出 40 以上，说明笔画根本没落到位 ——
     要么被描边 / 半透明糊住，要么字号小到抗锯齿把笔画抹平了。
     早先这里写的是「最暗 > 120」，但那是绝对阈值：
     #4E5969 的亮度本来就是 88，一个渲染得完美无缺的 #4E5969 字会被它判成「偏灰」，
     每跑一次就刷一屏假警报，真问题反而淹在里面。改成跟 fill 色比才有意义。 */
  const gap = (r) => r.minLum - r.fillLum;
  const bad = out.rows.filter((r) => gap(r) > 40);
  const soft = out.rows.filter((r) => gap(r) > 18 && gap(r) <= 40);
  const stroked = out.rows.filter((r) => r.stroke !== "none");
  const minScreenPx = Math.min(...out.rows.map((r) => r.screenPx));

  console.log(
    `\n########## ${f}   显示宽 ${DISPLAY_W[f]}px   缩放 ${out.scale}`,
  );
  console.log(
    `  text 总数 ${out.rows.length}｜仍带 stroke 的 ${stroked.length}｜糊（实测比理论色亮 40+）${bad.length}｜偏浅(18~40) ${soft.length}｜最小屏幕字号 ${minScreenPx}px`,
  );
  for (const r of [...bad, ...soft].slice(0, 12)) {
    console.log(
      `    ${r.text.padEnd(20)} fill=${r.fill.padEnd(18)} 画布${String(r.fontSize).padStart(5)}px → 屏${String(r.screenPx).padStart(5)}px   理论${String(r.fillLum).padStart(3)} 实测最暗${String(r.minLum).padStart(3)} 差${String(gap(r)).padStart(4)}`,
    );
  }
  summary[f] = {
    total: out.rows.length,
    stroked: stroked.length,
    bad: bad.length,
    soft: soft.length,
    minScreenPx,
  };
}

writeFileSync(
  resolve(process.cwd(), ".shots/_probe/text-legibility.json"),
  JSON.stringify(summary, null, 2),
);

await browser.close();
console.log("\n=== 汇总 ===");
console.log(JSON.stringify(summary, null, 2));

/**
 * 图内文字「装得下吗」检查器
 *
 * 为什么需要它：
 *   架构图是纯手写 SVG，坐标全靠算。字号一放大，最容易出的不是「难看」而是
 *   「文字捅出卡片/画布」——而这类问题在终端里看不出来，截图也只能靠人眼。
 *   这个脚本把每个 <text> 的**真实渲染包围盒**（getBBox，带字体度量）量出来，
 *   再做两件事：
 *     ① 越界：包围盒超出画布 → 一定被裁，报 error
 *     ② 出框：包围盒超出「包含它的最小矩形」（也就是它所在的那张卡片）→ 报 error
 *     ③ 可读性：按实际显示宽度换算屏幕字号，低于 11px 提示（图纸类图表的下限）
 *
 * 用法：node scripts/witkit-svg-fit.mjs [显示宽 默认 823]
 * 依赖 dev server 不需要 —— 直接读 src/assets/images 下的 .svg 文件。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const DISPLAY_W = Number(process.argv[2] || 823);
const IMG_DIR = "src/assets/images";

function collect(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) collect(p, out);
    else if (e.name.endsWith(".svg")) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

const files = collect(IMG_DIR).sort();
const browser = await chromium.launch();
const page = await browser.newPage();

let totalErr = 0;

for (const file of files) {
  const svg = readFileSync(file, "utf8");
  const vb = /viewBox="([^"]+)"/.exec(svg);
  if (!vb) continue;
  const [, , vbW, vbH] = vb[1].trim().split(/\s+/).map(Number);
  const scale = DISPLAY_W / vbW;

  /* 用一个真 HTML 文档承载：SVG 直接当文档时没有可靠的面板度量环境 */
  await page.setContent(
    `<body style="margin:0"><div id="host">${svg}</div></body>`,
    { waitUntil: "load" },
  );

  const report = await page.evaluate(
    ({ vbW, vbH }) => {
      const root = document.querySelector("#host svg");
      if (!root) return { error: "svg 未挂载" };
      const rects = [...root.querySelectorAll("rect")].map((r) => ({
        x: +r.getAttribute("x") || 0,
        y: +r.getAttribute("y") || 0,
        w: +r.getAttribute("width") || vbW,
        h: +r.getAttribute("height") || vbH,
        fill: r.getAttribute("fill") || "",
      }));
      const out = [];
      for (const t of root.querySelectorAll("text")) {
        const b = t.getBBox();
        const fs = Number.parseFloat(getComputedStyle(t).fontSize) || 0;
        const anchorX = b.x + b.width / 2;
        const anchorY = b.y + b.height / 2;
        /* 找「装住这个字的最小矩形」：它的锚点在框内，且面积最小。
           全画布背景那种超大 rect 会被自然排除（面积最大）。 */
        let box = null;
        for (const r of rects) {
          if (r.w >= vbW - 1 && r.h >= vbH - 1) continue; // 背景
          const hit =
            anchorX >= r.x &&
            anchorX <= r.x + r.w &&
            anchorY >= r.y &&
            anchorY <= r.y + r.h;
          if (!hit) continue;
          if (!box || r.w * r.h < box.w * box.h) box = r;
        }
        out.push({
          text: (t.textContent || "").trim().slice(0, 28),
          x: Math.round(b.x),
          y: Math.round(b.y),
          w: Math.round(b.width),
          h: Math.round(b.height),
          right: Math.round(b.x + b.width),
          bottom: Math.round(b.y + b.height),
          fs,
          anchor: t.getAttribute("text-anchor") || "start",
          box: box
            ? {
                x: box.x,
                right: box.x + box.w,
                y: box.y,
                bottom: box.y + box.h,
              }
            : null,
        });
      }
      return { count: out.length, items: out };
    },
    { vbW, vbH },
  );

  if (report.error) {
    console.log(`${file}: ${report.error}`);
    continue;
  }

  const issues = [];
  let minFs = Number.POSITIVE_INFINITY;
  for (const it of report.items) {
    minFs = Math.min(minFs, it.fs);
    if (it.x < -1 || it.right > vbW + 1 || it.y < -1 || it.bottom > vbH + 1) {
      issues.push(
        `  越界「${it.text}」 bbox=${it.x},${it.y} → ${it.right},${it.bottom}（画布 ${vbW}×${vbH}）`,
      );
    }
    if (it.box) {
      /* 容差 4 单位：中文字形侧边留白与 letter-spacing 会带来几个单位的正常外溢 */
      if (it.right > it.box.right + 4 || it.x < it.box.x - 4) {
        issues.push(
          `  出框「${it.text}」 字 x${it.x}→${it.right} 卡片 x${it.box.x}→${it.box.right}`,
        );
      }
      if (it.bottom > it.box.bottom + 4 || it.y < it.box.y - 4) {
        issues.push(
          `  出框(纵向)「${it.text}」 字 y${it.y}→${it.bottom} 卡片 y${it.box.y}→${it.box.bottom}`,
        );
      }
    }
  }

  const screenMin = (minFs * scale).toFixed(1);
  const flag = issues.length ? "✗" : "✓";
  console.log(
    `${flag} ${file}  画布 ${vbW}×${vbH}  显示宽 ${DISPLAY_W}  缩放 ${scale.toFixed(3)}  文字 ${report.count}  最小字 ${minFs}px（屏幕 ${screenMin}px）`,
  );
  for (const i of issues) console.log(i);
  totalErr += issues.length;
}

await browser.close();
console.log(totalErr ? `\n共 ${totalErr} 处问题` : "\n全部通过");
process.exit(totalErr ? 1 : 0);

/**
 * 首屏「光影殿堂」视觉校验
 * 运行：node scripts/check-hero.mjs [参考图路径]
 * 退出码：0 通过，1 有偏差
 *
 * 为什么需要它：首屏是「照着参考图还原」的活儿，靠肉眼看不出
 * 「光晕重心偏外」「字边过渡是硬切」这类问题——它们在数值上很明显，
 * 在观感上只是「说不上哪里不对」。所以把参考图量化成三组指标来对：
 *   ① 文字带位置（垂直中心、水平跨度）
 *   ② 亮度直方图（白芯/中档/光晕各占多少）
 *   ③ 光晕上升剖面（字边外侧用多少像素从暗爬到亮 = 「闪」的物理量）
 *
 * 需要 dev server 跑在 127.0.0.1:5300。
 * 参考图默认读项目根目录的「首屏F4-光影殿堂.png」。
 */
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const REF = process.argv[2] ?? resolve(ROOT, "../首屏F4-光影殿堂.png");
const URL = "http://127.0.0.1:5300/";
const TOPBAR = 100; // 固定顶栏高度，量文字带时要跳过，否则会被当成一条「文字带」

const fail = [];
const note = (ok, msg) => {
  console.log(`  ${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) fail.push(msg);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(2400);

/* 截图用「整页 + clip」而不是 locator.screenshot：
   locator.screenshot 要在元素句柄上做 scrollIntoView，一旦 Vite HMR 在等待期间
   重渲染了页面，句柄就脱离 DOM，报 "Element is not attached to the DOM" ——
   改样式时几乎必踩。整页截图没有句柄，稳。 */
const heroBox = await page.evaluate(() => {
  const r = document.querySelector(".hero").getBoundingClientRect();
  return {
    x: Math.round(r.left + window.scrollX),
    y: Math.round(r.top + window.scrollY),
    width: Math.round(r.width),
    height: Math.round(r.height),
  };
});
const shot = join(mkdtempSync(join(tmpdir(), "hero-")), "hero.png");
await page.screenshot({ path: shot, clip: heroBox });

/* ── 几何：元素位置与溢出 ── */
const geo = await page.evaluate(() => {
  const box = (s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      yc: Math.round(r.top + r.height / 2),
      w: Math.round(r.width),
      x0: Math.round(r.left),
      x1: Math.round(r.right),
    };
  };
  return {
    vh: window.innerHeight,
    brand: box(".hero-brand"),
    title: box(".hero-title"),
    innerW: Math.round(
      document.querySelector(".hero-inner").getBoundingClientRect().width,
    ),
    // 内容盒宽度（已扣掉左右 padding）。
    // 主张是 nowrap 居中，允许对称地溢进 padding 里 —— 两侧各让一点，视觉上仍居中；
    // 但溢出的量必须能被 padding 吸收，绝不能顶出视口。
    // 所以这里量的是「padding 够不够兜」，不是「有没有超出内容盒」。
    innerPad: Number.parseFloat(
      getComputedStyle(document.querySelector(".hero-inner")).paddingLeft,
    ),
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  };
});

/* ── 图像分析：在浏览器里解图（Node 侧没有 canvas） ── */
const analyze = (b64, skipTop) =>
  page.evaluate(
    async ([src, skip]) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error("image decode failed"));
        img.src = src;
      });
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const L = (x, y) => {
        const i = (y * c.width + x) * 4;
        return (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      };
      const TH = 0.62;

      /* 逐行亮像素数 → 分带 */
      const bands = [];
      let cur = null;
      for (let y = skip; y < c.height; y++) {
        let n = 0;
        for (let x = 0; x < c.width; x++) if (L(x, y) > TH) n++;
        if (n > c.width * 0.012) {
          if (!cur) cur = { y0: y, y1: y };
          else cur.y1 = y;
        } else if (cur) {
          if (cur.y1 - cur.y0 > 6) bands.push(cur);
          cur = null;
        }
      }
      if (cur && cur.y1 - cur.y0 > 6) bands.push(cur);

      const out = bands.slice(0, 4).map((bd) => {
        let core = 0;
        let bright = 0;
        let mid = 0;
        let glow = 0;
        let faint = 0;
        let dark = 0;
        let n = 0;
        let minX = c.width;
        let maxX = 0;
        for (let y = bd.y0; y <= bd.y1; y++) {
          for (let x = 0; x < c.width; x++) {
            const l = L(x, y);
            n++;
            if (l > 0.92) core++;
            else if (l > 0.75) bright++;
            else if (l > 0.5) mid++;
            else if (l > 0.3) glow++;
            else if (l > 0.15) faint++;
            else dark++;
            if (l > TH) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
        }
        const pc = (v) => +((v / n) * 100).toFixed(1);
        return {
          y0: bd.y0,
          y1: bd.y1,
          yc: Math.round((bd.y0 + bd.y1) / 2),
          h: bd.y1 - bd.y0,
          x0: minX,
          x1: maxX,
          w: maxX - minX,
          core: pc(core),
          bright: pc(bright),
          mid: pc(mid),
          glow: pc(glow),
          faint: pc(faint),
          dark: pc(dark),
        };
      });

      /* 光晕上升剖面：在主张中心行上找「暗→亮」上升沿，量到 50% 亮度用了多少像素 */
      const main = out[out.length - 1];
      let halfW = null;
      if (main) {
        const yy = main.yc;
        const seq = [];
        for (let x = 0; x < c.width; x++) seq.push(L(x, yy));
        const hws = [];
        for (let x = 1; x < c.width - 1; x++) {
          if (seq[x] < 0.3 && seq[x - 1] >= seq[x] && seq[x] <= seq[x + 1]) {
            let j = x;
            while (j < c.width - 1 && seq[j + 1] >= seq[j]) j++;
            if (seq[j] > 0.75 && j - x > 2) {
              const half = seq[x] + (seq[j] - seq[x]) * 0.5;
              let k = x;
              while (k < j && seq[k] < half) k++;
              hws.push(k - x);
            }
            x = j;
          }
        }
        if (hws.length) {
          hws.sort((a, b) => a - b);
          halfW = hws[Math.floor(hws.length / 2)];
        }
      }
      return { w: c.width, h: c.height, bands: out, halfW };
    },
    [`data:image/png;base64,${b64}`, skipTop],
  );

const cur = await analyze(readFileSync(shot).toString("base64"), TOPBAR);

console.log("── 首屏几何（1440×900）──");
console.log(
  `  品牌名中心 y=${geo.brand.yc} (${((geo.brand.yc / geo.vh) * 100).toFixed(1)}%)  宽 ${geo.brand.w}`,
);
console.log(
  `  主张中心 y=${geo.title.yc} (${((geo.title.yc / geo.vh) * 100).toFixed(1)}%)  宽 ${geo.title.w}`,
);
note(
  geo.scrollW <= geo.clientW,
  `无横向溢出（${geo.scrollW} vs ${geo.clientW}）`,
);
// 主张是 nowrap 居中：字号按视口反推，在窄视口下会略微溢进 padding。
// 只要溢出的量能被左右 padding 对称吸收，视觉上仍居中、也没出血 —— 这是允许的。
// ⚠️ 不能拿 title.w 直接跟 .hero-inner 的 border-box 宽比（那样永远绿）：
// 那是「比错了对象」—— 哪怕字已经顶穿 padding 贴到视口边缘，断言照样通过。
const contentW = geo.innerW - geo.innerPad * 2;
const over = Math.max(0, geo.title.w - contentW);
note(
  over / 2 <= geo.innerPad,
  `主张溢出被 padding 吸收（溢出 ${over}px，左右各让 ${(over / 2).toFixed(1)}px ≤ padding ${geo.innerPad}px）`,
);
note(
  geo.title.x0 >= 0 && geo.title.x1 <= geo.clientW,
  `主张两侧不出血（x ${geo.title.x0}–${geo.title.x1}）`,
);
note(
  consoleErrors.length === 0,
  `无 console 报错${consoleErrors.length ? `：${consoleErrors.join(" | ")}` : ""}`,
);

if (!existsSync(REF)) {
  console.log(`\n⚠ 未找到参考图，跳过对比：${REF}`);
} else {
  const ref = await analyze(readFileSync(REF).toString("base64"), 0);
  console.log("\n── 与参考图对比 ──");
  console.log(`  ${"".padEnd(12)} ${"当前".padEnd(22)} 参考`);
  const row = (label, a, b, tol, unit = "%") => {
    const ok = Math.abs(a - b) <= tol;
    note(
      ok,
      `${label.padEnd(12)} ${String(a + unit).padEnd(22)} ${b}${unit}（容差 ±${tol}${unit}）`,
    );
  };

  const cb = cur.bands[0];
  const rb = ref.bands[0];
  const ct = cur.bands[cur.bands.length - 1];
  const rt = ref.bands[ref.bands.length - 1];

  if (cb && rb)
    row(
      "品牌名中心",
      +((cb.yc / 900) * 100).toFixed(1),
      +((rb.yc / 900) * 100).toFixed(1),
      2,
    );
  if (ct && rt)
    row(
      "主张中心",
      +((ct.yc / 900) * 100).toFixed(1),
      +((rt.yc / 900) * 100).toFixed(1),
      2,
    );

  if (ct && rt) {
    /* 光晕直方图：字号不同 → 占比不可逐档硬比，只看「中档(50-75)」这个
       「闪不闪」的关键档，要求达到参考的六成以上，且外圈不溢出。 */
    console.log(
      `  主张亮度分布  当前 白芯 ${ct.core} / 中 ${ct.mid} / 晕 ${ct.glow} / 淡 ${ct.faint}`,
    );
    console.log(
      `                参考 白芯 ${rt.core} / 中 ${rt.mid} / 晕 ${rt.glow} / 淡 ${rt.faint}`,
    );
    note(
      ct.mid >= rt.mid * 0.6,
      `中档(50–75%) 达到参考六成以上（${ct.mid} vs ${rt.mid}）`,
    );
    note(ct.glow <= rt.glow * 1.8, `外圈光晕不散（${ct.glow} vs ${rt.glow}）`);
    note(
      ct.faint <= rt.faint + 15,
      `字腔不起雾（淡档 ${ct.faint} vs ${rt.faint}）`,
    );
  }

  if (cur.halfW != null && ref.halfW != null) {
    console.log(`  光晕上升半宽  当前 ${cur.halfW}px / 参考 ${ref.halfW}px`);
    note(
      Math.abs(cur.halfW - ref.halfW) <= 12,
      `字边过渡坡度接近参考（${cur.halfW} vs ${ref.halfW}px）`,
    );
  }
}

/* ── 移动端 ── */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1600);
/* 判空再取：改样式时 HMR 会短暂卸载组件，此时 querySelector 返回 null，
   直接取 .getBoundingClientRect() 会抛「Cannot read properties of null」
   把整个校验脚本打断（报错点在脚本里、不在设计上，容易误导）。 */
const mob = await page.evaluate(() => {
  const t = document.querySelector(".hero-title");
  return {
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    titleW: t ? Math.round(t.getBoundingClientRect().width) : null,
  };
});
console.log("\n── 移动端 390×844 ──");
if (mob.titleW == null) {
  note(false, "移动端未取到 .hero-title（页面可能正在重载，重跑一次即可）");
} else {
  note(mob.scrollW <= mob.clientW, `无横向溢出（主张宽 ${mob.titleW}）`);
}

await browser.close();

console.log(fail.length ? `\n❌ ${fail.length} 项不通过` : "\n✅ 首屏校验全绿");
process.exit(fail.length ? 1 : 0);

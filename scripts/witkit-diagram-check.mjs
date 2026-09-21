/**
 * TechDiagram 渲染验收（回归用）
 *
 * 验的是「图真的画出来了」，而不是「图存在」：
 *   根节点 opacity = 1（进了视口）
 *   连线 stroke-dashoffset = 0（逐笔绘制跑完）
 *   节点组 opacity = 1（节点淡入跑完）
 *
 * 另外单独验一次「跳过来的」情况：直接滚到图的下方，
 * 图必须立刻给终态，不能停在 opacity: 0。
 *
 * ── 2026-09-19 修：这个脚本曾经整段失效而没人发现 ──
 * 它原来只打开首页、找 `#systems` —— 那是三大体系还在首页时候的写法。
 * 后来首页改成纯「关于我们」（不放产品与服务介绍），架构图搬到 /tech/:slug，
 * 于是脚本每次都在等一个永远不出现的元素，15 秒后超时。
 * 教训：**验收脚本不在 npm scripts 里串着跑，就会烂掉而无人知晓。**
 * 所以这次修完，顺手把它挂进了 package.json。
 *
 * 跑法：node scripts/witkit-diagram-check.mjs
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

/** 三张架构图现在各自住在自己的技术体系页上 */
const PAGES = ["/tech/hec", "/tech/uef", "/tech/cep"];

const browser = await chromium.launch();

/* 打开页面并确保数据已到位（图有 DOM 才算到位）。
   为什么可能要重载：全新浏览器上下文里 MSW 的 Service Worker 得先安装激活，
   首次挂载发出的 /api 请求可能还没被拦到，页面会停在错误态 ——
   那时候等不到 .diagram，不是「代码有问题」，是「环境没起来」。 */
async function open(path) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  try {
    await page.waitForSelector(".diagram", { timeout: 6000 });
  } catch {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".diagram", { timeout: 15000 });
  }
  return page;
}

const problems = [];

const READ = () =>
  [...document.querySelectorAll(".diagram")].map((d) => {
    const cs = getComputedStyle(d);
    const wire = d.querySelector(".draw");
    const fade = d.querySelector(".draw-fade");
    return {
      klass: d.className,
      opacity: Number(cs.opacity),
      dashoffset: Number.parseFloat(getComputedStyle(wire).strokeDashoffset),
      fadeOpacity: fade ? Number(getComputedStyle(fade).opacity) : 1,
      top: Math.round(d.getBoundingClientRect().top),
    };
  });

/* ① 每页滚到图的位置，等图真的画完再检查 —— 三张图都要完整绘出 */
for (const path of PAGES) {
  const page = await open(path);
  const count = await page.locator(".diagram").count();

  if (count !== 1) {
    problems.push(`${path} 上应当是 1 张架构图，实际 ${count} 张`);
  }

  for (let i = 0; i < count; i++) {
    await page.evaluate((n) => {
      document
        .querySelectorAll(".diagram")
        [n].scrollIntoView({ block: "center" });
    }, i);

    /* 等「条件成立」，不是「睡够时间」。
       原来这里写的是固定 waitForTimeout(1700)（按最长动画 450+900 算的），
       结果浏览器冷启动那一次会偶发失败：页面首帧还没排上，
       固定时长已经走完，读到的是动画尚未开始的状态。
       固定时长在慢机器上永远是错的 —— 要么拖长（白等），要么偶发假报。
       改成等真实条件成立，顺带把「永远画不出来」和「只是慢一点」区分开了。 */
    let drawn = true;
    try {
      await page.waitForFunction(
        (n) => {
          const d = document.querySelectorAll(".diagram")[n];
          if (!d?.classList.contains("is-drawn")) return false;
          const wire = d.querySelector(".draw");
          const fade = d.querySelector(".draw-fade");
          return (
            (!wire ||
              Number.parseFloat(getComputedStyle(wire).strokeDashoffset) ===
                0) &&
            (!fade || Number(getComputedStyle(fade).opacity) > 0.99)
          );
        },
        i,
        { timeout: 8000 },
      );
    } catch {
      drawn = false;
    }

    const state = (await page.evaluate(READ))[i];
    console.log(
      `  ${path}  opacity=${state.opacity} 连线=${state.dashoffset} 节点=${state.fadeOpacity}  ${drawn ? "✓" : "⚠"}`,
    );
    if (!drawn) problems.push(`${path} 图超时未画完：${JSON.stringify(state)}`);
  }

  await page.screenshot({
    path: `${OUT}/diagram-${path.split("/").pop()}.png`,
  });
  await page.close();
}

/* ② 跳转过来：一次滚过整张图，图必须立刻给终态 */
{
  const path = PAGES[0];
  const page = await open(path);
  /* 滚到远超过图的深度，保证图已经被「跳过」到视口上方 */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  const states = await page.evaluate(READ);
  for (const [i, s] of states.entries()) {
    const passedBy = s.top < 0;
    const ok = !passedBy || (s.opacity > 0.99 && s.fadeOpacity > 0.99);
    console.log(
      `  跳转后 ${path} 图 ${i + 1}  top=${String(s.top).padStart(5)} 跳过=${passedBy} opacity=${s.opacity}  ${ok ? "✓" : "⚠"}`,
    );
    if (!ok)
      problems.push(`跳转后图 ${i + 1} 停在隐藏态：${JSON.stringify(s)}`);
  }
  await page.close();
}

await browser.close();
console.log("");
if (problems.length) {
  console.error("发现问题：");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  `✅ 三张架构图在两种滚动方式下都完整绘出。截图在 ${OUT}/diagram-*.png`,
);

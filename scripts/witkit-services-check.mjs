/**
 * 服务页（/services）结构验收 —— 钉住用户几轮点名的要求：
 *   1) 体系总览图占一整屏、图上的字要看得清（contain 完整显示，不裁切）
 *      判定方式：把图的实际渲染宽度按 viewBox 比例换算回屏幕字号，
 *      这个数就是「读者眼里图上小字多大」，比量容器宽度更接近真实诉求
 *   2) 总览图上不再有「示意图：…」标注条（2026-09-20 用户：「示意图的这些东西都不要」）
 *   3) CTA「想接入其中一层？」放在三大体系介绍完之后（2026-09-20 定稿），
 *      且是普通浅色区块 —— 不再 section-ink 深色底，也没有蓝图网格
 *   4) 三大体系（2026-09-20 改版，用户：「可以移动部分文字到图片下面，放大图片」）：
 *      · 能力清单从文字列挪到图**下方**，横跨两列 → 图列拿到 1.9fr，图明显变大
 *      · 交错方向不变（1 图左 / 2 图右 / 3 图左），脚注横跨两列所以不跟着翻
 *      · 图位无卡片框（无边框/无内边距），架构图直接顶到列边
 *      · 文字列的指标贴底，列高与图对齐，列底不留空白
 *   5) 三档宽度都不横向溢出、控制台干净
 *
 * 跑法：node scripts/witkit-services-check.mjs（需 dev server 在 5300）
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.WITKIT_BASE ?? "http://127.0.0.1:5300";
const HERE = dirname(fileURLToPath(import.meta.url));
const SVG_DIR = resolve(HERE, "../src/assets/images/systems");

/* 图的画布宽（overview.svg 的 viewBox 是 0 0 1600 900）与图内卡片标题字号。
   改 SVG 时这两个数要跟着改 —— 它们是「图上字多大」的唯一事实来源。 */
const SVG_W = 1600;
const CARD_TITLE_FS = 19;

/* ⚠️ 体系架构图（systems/*.svg）的图内最小字号 —— **从 SVG 文件里实际解析**，
   不写常量。
   起因：1440 视口下图宽 823px / 画布 1600 = 缩放 0.514，原先图里写 13px 的注释
   在读者眼里只有 6.7px，三张图近六成文字糊成灰点（用户：「图里的字糊」）。
   2026-09-20 已把三张图的最小字号统一提到 22（屏幕 11.3px）。
   为什么解析而不写死常量：写死的话，改图的人把字号改回 14px、常量还是 22，
   这条断言照样全绿 —— 就是「断言空转」。解析真实值才守得住。 */
const SYSTEM_SVG_W = 1600;
function minFontSizeInSvg(slug) {
  const svg = readFileSync(resolve(SVG_DIR, `${slug}.svg`), "utf8");
  const sizes = [...svg.matchAll(/font-size="(\d+(?:\.\d+)?)"/g)].map((m) =>
    Number(m[1]),
  );
  return sizes.length ? Math.min(...sizes) : 0;
}

/* 图内次要文字的对比度 —— 同样是**从 SVG 文件里实际解析**。
   起因：三张图的注释小字用了 #6B7280，在浅灰卡片 #F6F7F9 上只有 4.51:1，
   而它在屏幕上才 11.3px —— 小字号 + 刚过 AA 线 = 看着像没画完的灰块
   （子代理目视复核原话：「浅灰字压浅灰底，糊成一团基本不可读」）。
   已统一成同图本来就在用的 #4E5969（6.4~7.1:1）。
   为什么解析而不是写常量：写常量的话，改图的人换回浅灰、常量还是深灰，
   断言照样全绿 —— 又是空转。 */
const MIN_CONTRAST = 4.5;
function lum(hex) {
  const c = hex
    .replace("#", "")
    .match(/../g)
    .map((h) => {
      const v = Number.parseInt(h, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
/** 图里「深色文字 vs 它可能压的浅色底」的最差对比度。
 *  ⚠️ 三个坑，都是实测踩出来的：
 *  ① 不能把所有文字色都拿去比所有浅底：图里有白字（#FFFFFF），
 *     它是给深色块 / 蓝色块用的，拿它比白底必然算出 1:1，这条断言就永远红了。
 *  ② 但「排除浅色文字」的筛子不能太宽。第一版写的是「压白底 ≥3:1 才算深色文字」，
 *     结果反向验证时把 #9AA3AF（浅灰）也筛掉了 —— 它压白底只有 2.55:1，
 *     正好是「浅到看不清」的典型，却被当成「浅色文字」放过，该红没红。
 *     正确的分界是**亮度**而不是「能不能读」：只有近乎白（压白底 <1.5:1）的
 *     才是真正给深底用的浅色文字（#FFFFFF / #DCE8FF）。
 *     中间那些灰，无论多浅，都必须按深底上的正文来要求对比度。
 *  ③ 文字色不一定写在 <text> 上。HEC 图把 fill 挂在 `<g font-size="26"
 *     fill="#0B0F19">` 上让子节点继承，只匹配 `<text[^>]*fill=` 会一个都收不到，
 *     于是 worst 保持 Infinity、断言恒过 —— 又一次空转。<g fill> 也要收。 */
function worstTextContrast(slug) {
  const svg = readFileSync(resolve(SVG_DIR, `${slug}.svg`), "utf8");
  const colors = [
    ...new Set(
      [
        ...svg.matchAll(/<text[^>]*\bfill="(#[0-9A-Fa-f]{6})"/g),
        ...svg.matchAll(/<g[^>]*\bfont-size[^>]*\bfill="(#[0-9A-Fa-f]{6})"/g),
        ...svg.matchAll(/<g[^>]*\bfill="(#[0-9A-Fa-f]{6})"[^>]*\bfont-size/g),
      ].map((m) => m[1].toUpperCase()),
    ),
  ];
  /* 图内出现过的浅色底（卡片 / 面板） */
  const LIGHT_BGS = ["#FFFFFF", "#F6F7F9", "#EEF4FF", "#DCE8FF"];
  /* 近乎白的色（给深底用的浅色文字）才跳过；灰色一律纳入考核 */
  const NEAR_WHITE = 1.5;
  let worst = { ratio: Number.POSITIVE_INFINITY, color: "", bg: "" };
  for (const c of colors) {
    if (contrast(c, "#FFFFFF") < NEAR_WHITE) continue;
    for (const bg of LIGHT_BGS) {
      const r = contrast(c, bg);
      if (r < worst.ratio) worst = { ratio: r, color: c, bg };
    }
  }
  return worst;
}

/* 分层图「轴与内容必须对得上」——静态自洽检查，不需要 dev server。
 *
 * 起因：UEF 图左侧轴画了 L4→L0 五个刻度、五个层号，但层块只有四个
 * （y=130/310/490/670）。第 5 个刻度 y=870 指向一个从不存在、也不可能存在的层
 * （层高 170，y=870 起会探出 1000 的画布底）。于是 L0 孤零零悬在最下面，
 * 读起来像「这层内容漏了」。字号、对比度、溢出、控制台报错**全都抓不到它**。
 *
 * 规则：L 标签数 == 层块数；每个 L 标签必须有对应层块的顶边刻度。
 * 解析方式：层块 = 左列宽 800 的分层卡；刻度 = 左侧轴上的蓝色短横线。 */
function layerAxisConsistency(slug) {
  const svg = readFileSync(resolve(SVG_DIR, `${slug}.svg`), "utf8");
  const labels = [...svg.matchAll(/>L(\d)</g)].map((m) => Number(m[1]));
  const layerTops = [
    ...svg.matchAll(/<rect x="130" y="(\d+)" width="800"/g),
  ].map((m) => Number(m[1]));
  /* 左侧轴刻度：x1=84 → x2=100 的短横线 */
  const ticks = [...svg.matchAll(/<line x1="84" y1="(\d+)" x2="100"/g)].map(
    (m) => Number(m[1]),
  );
  /* 刻度落在层块顶边 +20 处（150 vs 130 / 330 vs 310 …），即「标在该层上方」 */
  const TICK_OFFSET = 20;
  const tickMatchesLayer = ticks.every((t) =>
    layerTops.some((y) => Math.abs(y + TICK_OFFSET - t) <= 1),
  );
  return {
    labelCount: labels.length,
    layerCount: layerTops.length,
    tickCount: ticks.length,
    tickMatchesLayer,
    ok:
      labels.length === layerTops.length &&
      ticks.length === layerTops.length &&
      tickMatchesLayer,
  };
}

const fails = [];
const assert = (ok, label, detail) => {
  console.log(
    `${ok ? "  ✓" : "  ×"} ${label}${detail && !ok ? `　→ ${detail}` : ""}`,
  );
  if (!ok) fails.push(label);
};

/* 三大体系的 slug，顺序必须与页面渲染顺序一致（1 图左 / 2 图右 / 3 图左）。
   用来把「第 i 个体系」对应到 systems/{slug}.svg 去解析图内字号。 */
const systemSlugs = ["hec", "uef", "cep"];

/* 静态检查：分层图的轴与层块必须一一对应。跑一次就够，不进视口循环。 */
console.log("[静态] 分层图轴/层块自洽");
for (const [i, slug] of systemSlugs.entries()) {
  const ax = layerAxisConsistency(slug);
  assert(
    ax.ok,
    `静态：体系 ${i + 1}（${slug}.svg）层号数 = 层块数 = 刻度数`,
    `层号 ${ax.labelCount} / 层块 ${ax.layerCount} / 刻度 ${ax.tickCount}${ax.tickMatchesLayer ? "" : "（刻度未对齐层顶）"}`,
  );
}
console.log("");

const browser = await chromium.launch();

for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["laptop", 1180, 800],
  ["mobile", 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  const noise = [];
  page.on("console", (m) => {
    if (m.type() === "error") noise.push(m.text());
  });
  page.on("pageerror", (e) => noise.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) noise.push(`[http ${r.status()}] ${r.url()}`);
  });

  await page.goto(`${BASE}/services`, { waitUntil: "networkidle" });
  /* ⚠️ 必须等页面真的渲染出来再取数：只用 waitForTimeout 时，
     dev server 偶尔慢一拍，量到的全是 0（实测在 1180 档偶发过一次，
     报出「整屏高 0px / 图宽 0px」共 8 条假失败）。等真实条件成立才稳。 */
  await page.waitForSelector(".map-stage", { state: "attached" });
  await page.waitForSelector(".system", { state: "attached" });
  await page.waitForTimeout(500);

  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const box = (el) => el?.getBoundingClientRect();
    const map = q(".map-fp");
    const stage = q(".map-stage");
    const img = q(".map-stage img");
    const cta = q(".cta");
    const systems = q(".systems");
    /* compareDocumentPosition 的返回值是个位掩码：4 = FOLLOWING（参数在调用者之后） */
    const following = (a, b) =>
      !!(
        a &&
        b &&
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
      );
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      mapH: Math.round(box(map)?.height ?? 0),
      stageW: Math.round(box(stage)?.width ?? 0),
      /* 有图时量 <img> 自身，没图（占位框）时退回量容器 —— 两种情况都要成立 */
      imgW: Math.round(box(img)?.width ?? box(stage)?.width ?? 0),
      imgH: Math.round(box(img)?.height ?? 0),
      hasImg: !!img,
      /* 2026-09-20：标注条必须不存在（而不是存在但为空） */
      captionGone: !q(".map-caption"),
      /* 顺序：map → systems → cta */
      mapBeforeSystems: following(map, systems),
      systemsBeforeCta: following(systems, cta),
      ctaTitle: q(".cta-title")?.textContent?.trim() ?? "",
      ctaHref: q(".cta .btn")?.getAttribute("href") ?? "",
      ctaIsInk: !!cta?.classList.contains("section-ink"),
      ctaHasGrid: !!cta?.querySelector(".cta-grid"),
      sysCount: document.querySelectorAll(".system").length,
      /* 每个体系：图列 / 文字列 / 脚注 三块的几何关系 */
      sys: [...document.querySelectorAll(".system")].map((a) => {
        const visual = a.querySelector(".system-visual");
        const body = a.querySelector(".system-body");
        const foot = a.querySelector(".system-foot");
        const features = a.querySelector(".system-features");
        const metrics = a.querySelector(".system-metrics");
        const titleLink = a.querySelector(".system-title-link");
        const nameEl = a.querySelector(".system-name");
        const cs = getComputedStyle(visual);
        const vb = box(visual);
        const bb = box(body);
        const fb = box(foot);
        return {
          border: cs.borderTopWidth,
          pad: cs.paddingTop,
          /* 标题即入口（用户 2026-09-20）：标题必须是指向 /tech/{slug} 的链接，
             且与页面底部「查看 XX 技术细节 →」、顶栏「服务 → XX」同落点。
             只判断「是不是链接」不够 —— 落点写错照样绿，所以比的是 href。 */
          titleHref: titleLink?.getAttribute("href") ?? "",
          titleIsLink: titleLink?.tagName === "A",
          titleAria: titleLink?.getAttribute("aria-label") ?? "",
          /* 标题字号（用户：「标题可以大一些」）。从计算样式取真实值，不写常量。 */
          titleFs: nameEl
            ? Number.parseFloat(getComputedStyle(nameEl).fontSize)
            : 0,
          /* 标题热区宽 —— 整行可点，应该接近文字列宽，而不是只有三个字母那么点 */
          titleLinkW: Math.round(box(titleLink)?.width ?? 0),
          footLinkHref:
            a.querySelector(".system-link")?.getAttribute("href") ?? "",
          imgW: Math.round(box(visual.querySelector("img"))?.width ?? 0),
          colW: Math.round(vb?.width ?? 0),
          bodyW: Math.round(bb?.width ?? 0),
          footW: Math.round(fb?.width ?? 0),
          rowW: Math.round((vb?.width ?? 0) + (bb?.width ?? 0)),
          /* 图在文字左边？用来守交错方向（1 图左 / 2 图右 / 3 图左） */
          visualOnLeft: (vb?.left ?? 0) < (bb?.left ?? 0),
          /* 能力清单是否在图的下方（不在图右侧） */
          featuresBelowVisual:
            (features?.getBoundingClientRect().top ?? 0) >=
            (vb?.bottom ?? 0) - 2,
          /* 能力清单是否横跨两列（宽度接近整行，而不是只有图列那么宽） */
          featuresSpanFull:
            Math.abs(
              (features?.getBoundingClientRect().width ?? 0) - (fb?.width ?? 0),
            ) < 2,
          /* 指标是否贴到文字列底部（列底无空白）：指标底 ≈ 文字列底 */
          metricsFlushBottom:
            Math.abs(
              (metrics?.getBoundingClientRect().bottom ?? 0) -
                (bb?.bottom ?? 0),
            ) <= 2,
          /* 能力清单里蓝点是否与标题同行 */
          dotsAligned: [...a.querySelectorAll(".system-features li")].every(
            (li) => {
              const d = li.querySelector(".dot")?.getBoundingClientRect();
              const s = li.querySelector("strong")?.getBoundingClientRect();
              if (!d || !s) return false;
              const cy = d.top + d.height / 2;
              return (
                cy >= s.top - 3 && cy <= s.top + Math.min(s.height, 26) + 3
              );
            },
          ),
        };
      }),
    };
  });

  /* 图内字号 → 屏幕字号的换算。这是这一页最核心的一条：字到底够不够大 */
  const onScreen = Math.round((m.imgW / SVG_W) * CARD_TITLE_FS * 10) / 10;

  console.log(
    `\n[${name} ${width}×${height}]  整屏高 ${m.mapH}px  图宽 ${m.imgW}px  图内 19px 字 → 屏幕 ${onScreen}px`,
  );

  /* 1) 图占一整屏 */
  assert(
    m.mapH >= m.vh * 0.9,
    `${name}：总览图那块占满一屏（≥ 视口 90%）`,
    `${m.mapH}px / 视口 ${m.vh}px`,
  );
  assert(
    m.imgW >= m.vw * 0.8,
    `${name}：图宽 ≥ 视口 80%（图不再缩在容器里）`,
    `${m.imgW}px / 视口 ${m.vw}px`,
  );
  /* 桌面与笔记本都要求换算后 ≥ 12px。阈值按宽度分档而不是按高度：
     图宽同时受视口高与视口宽约束，1180×800 这类「矮而窄」的笔记本反推出来
     就是 1065px 宽，这是它的物理上限。手机不设字号阈值 —— 一张 16:9 横图
     放在 390px 宽里必然读不了，那里只守「铺满宽度」与「不溢出」。 */
  const minOnScreen = width >= 900 ? 12 : 0;
  if (minOnScreen) {
    assert(
      onScreen >= minOnScreen,
      `${name}：图上卡片标题换算到屏幕 ≥ ${minOnScreen}px`,
      `${onScreen}px`,
    );
  }

  /* 2) 示意图标注条已删 */
  assert(m.captionGone, `${name}：总览图上没有「示意图」标注条`);

  /* 3) CTA 位置与配色（2026-09-20 定稿：三个体系讲完再收口，浅色普通区块） */
  assert(
    m.ctaTitle === "想接入其中一层？" && !m.ctaIsInk && !m.ctaHasGrid,
    `${name}：CTA 在（浅色普通区块，无网格）+ 标题「想接入其中一层？」`,
    `${m.ctaTitle} / ink=${m.ctaIsInk} / grid=${m.ctaHasGrid}`,
  );
  assert(m.mapBeforeSystems, `${name}：总览图排在三大体系之前`);
  assert(
    m.systemsBeforeCta,
    `${name}：CTA 排在三大体系之后（介绍完三个再收口）`,
  );
  assert(
    m.ctaHref === "/#contact",
    `${name}：CTA 主按钮仍指向 /#contact`,
    m.ctaHref,
  );

  /* 4) 三大体系：图直接顶满图列，无卡片框；能力清单在图下方且横跨两列 */
  assert(m.sysCount === 3, `${name}：三大体系齐全`, `${m.sysCount}`);
  for (const [i, v] of m.sys.entries()) {
    assert(
      v.border === "0px" && v.pad === "0px",
      `${name}：体系 ${i + 1} 图位无卡片框（无边框/无内边距）`,
      `border=${v.border} pad=${v.pad}`,
    );
    assert(
      v.imgW >= v.colW * 0.95,
      `${name}：体系 ${i + 1} 图顶满图列`,
      `${v.imgW}px / 列 ${v.colW}px`,
    );
    /* 交错方向：1 图左 / 2 图右 / 3 图左（用户明确要求保持不变）。
       单列布局（窄屏）下两列同宽同左，不适用。 */
    if (width > 1024) {
      assert(
        v.visualOnLeft === (i % 2 === 0),
        `${name}：体系 ${i + 1} 图在${i % 2 === 0 ? "左" : "右"}（交错方向未变）`,
        `visualOnLeft=${v.visualOnLeft}`,
      );
    }
    /* 2026-09-20 改版核心：图列明显大于文字列（把宽度让给图） */
    if (width > 1024) {
      assert(
        v.colW > v.bodyW * 1.5,
        `${name}：体系 ${i + 1} 图列宽 > 文字列 1.5 倍（图放大）`,
        `图列 ${v.colW}px / 文字列 ${v.bodyW}px`,
      );
    }
    /* 图内最小字号换算到屏幕 —— 用户反馈过「图里的字糊」。
       字号从 SVG 文件实际解析（见 minFontSizeInSvg），阈值 11px：
       图内 22px 在 823px 显示宽下正好是 11.3px，留 0.3px 余量。
       这条卡住的是「改图时把字号写小」，也就是当初糊字的根因。 */
    const minFs = minFontSizeInSvg(systemSlugs[i]);
    const sysMinOnScreen =
      Math.round((v.imgW / SYSTEM_SVG_W) * minFs * 10) / 10;
    if (width >= 1200) {
      assert(
        minFs >= 22 && sysMinOnScreen >= 11,
        `${name}：体系 ${i + 1} 图内最小字 ${minFs}px 换算到屏幕 ≥ 11px`,
        `${minFs}px → ${sysMinOnScreen}px`,
      );
      /* 图内次要文字的对比度。字号达标不等于看得清 ——
         11.3px 的字如果只有 4.5:1，在浅灰卡片上依然像灰块。
         只在这一档跑（大屏才是「小字被压缩」的场景）。 */
      const wc = worstTextContrast(systemSlugs[i]);
      assert(
        wc.ratio >= MIN_CONTRAST,
        `${name}：体系 ${i + 1} 图内文字对比度 ≥ ${MIN_CONTRAST}:1（最差 ${wc.color} on ${wc.bg}）`,
        `${wc.ratio.toFixed(2)}:1`,
      );
    }
  }

  /* 4b) 能力清单已挪到图下方（这是 2026-09-20 改版的目的），横跨两列 */
  if (width > 1024) {
    for (const [i, v] of m.sys.entries()) {
      assert(
        v.featuresBelowVisual,
        `${name}：体系 ${i + 1} 能力清单在图的**下方**（不在图右侧）`,
      );
      assert(
        v.featuresSpanFull,
        `${name}：体系 ${i + 1} 能力清单横跨两列（不受交错翻转影响）`,
        `清单宽 ${v.footW}px`,
      );
      assert(
        v.metricsFlushBottom,
        `${name}：体系 ${i + 1} 指标贴底、文字列无残余空白`,
      );
      assert(v.dotsAligned, `${name}：体系 ${i + 1} 能力清单的蓝点与标题同行`);
    }
  }

  /* 4c) 标题即入口（用户 2026-09-20）：
     「HEC 标题可以大一些，并且点击可以跳转到导航栏里点击 HEC 跳转到那个页面」。
     三条一起守：① 是链接 ② 落点 = /tech/{slug}，且与底部那条链接同落点
     ③ 字号比改版前的 36px 大 ④ 热区铺满文字列（不是只点三个字母） */
  for (const [i, v] of m.sys.entries()) {
    const slug = systemSlugs[i];
    assert(
      v.titleIsLink && v.titleHref === `/tech/${slug}`,
      `${name}：体系 ${i + 1} 标题指向 /tech/${slug}`,
      `isLink=${v.titleIsLink} href="${v.titleHref}"`,
    );
    assert(
      v.titleHref === v.footLinkHref && !!v.titleHref,
      `${name}：体系 ${i + 1} 标题与底部「技术细节」同落点（不会各指一边）`,
      `标题 ${v.titleHref} / 底部 ${v.footLinkHref}`,
    );
    assert(
      v.titleAria.includes(slug.toUpperCase()),
      `${name}：体系 ${i + 1} 标题链接有无障碍名（读屏不只念代号）`,
      `aria-label="${v.titleAria}"`,
    );
    /* 字号阈值分档：窄屏字号本来就该降（46px 在 390px 宽里会撑爆），
       所以手机只要求 ≥ 36px（改版前手机是 26px，这次也一起上调了）。 */
    const minTitleFs = width > 1024 ? 46 : 36;
    assert(
      v.titleFs >= minTitleFs,
      `${name}：体系 ${i + 1} 标题字号 ≥ ${minTitleFs}px（改版前 ${width > 1024 ? 36 : 26}px）`,
      `${v.titleFs}px`,
    );
    if (width > 1024) {
      assert(
        v.titleLinkW >= v.bodyW * 0.9,
        `${name}：体系 ${i + 1} 标题热区铺满文字列（整行可点）`,
        `热区 ${v.titleLinkW}px / 文字列 ${v.bodyW}px`,
      );
    }
  }

  /* 5) 不溢出、控制台干净 */
  assert(m.overflow <= 1, `${name}：不横向溢出`, `${m.overflow}px`);
  assert(noise.length === 0, `${name}：控制台无报错`, noise.join(" | "));

  if (name === "desktop") {
    /* 只截「滚到总览图那一刻的视口」—— 这一页要看的正是「一屏里图有多大」，
       整页长图反而看不出这个 */
    await page.evaluate(() => {
      document.querySelector(".map-fp")?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: ".shots/services-map-viewport.png" });

    /* 三大体系逐屏截 —— 改版后要看的是「图多大、清单在不在图下面」，
       整页长图会被 v-reveal 的 opacity:0 骗成一片空白。 */
    const tops = await page.evaluate(() =>
      [...document.querySelectorAll(".system")].map((a) =>
        Math.round(a.getBoundingClientRect().top + window.scrollY),
      ),
    );
    for (const [i, top] of tops.entries()) {
      await page.evaluate((y) => window.scrollTo(0, y - 40), top);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `.shots/services-system-${i + 1}.png` });
    }
  }

  await page.close();
}

await browser.close();
console.log(
  fails.length
    ? `\n× 失败 ${fails.length} 项：\n  - ${fails.join("\n  - ")}`
    : "\n✅ 服务页结构全部通过",
);

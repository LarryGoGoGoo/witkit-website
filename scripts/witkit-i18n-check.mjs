/**
 * 本轮改动专项验收：
 *   1) 顶栏语言切换 简 / 繁 —— 真的能切，且切完文案真的变了
 *   2) 产品下拉面板 —— 分好类一次罗列完，且没有小字介绍
 *   3) 产品链接 —— 是外链 <a href>，且指向真实站点（不是内部 /product/:slug）
 *   4) 首屏大字 —— 只占一行（不折行）、够大
 *   5) 关于我们（＝首页 /）—— 三块整屏页（公司简介 / 愿景及使命 / 企业文化）
 *      + 行为准则 / 联系我们（字节式）；标题左对齐、不讲具体产品；
 *      只有企业文化是「整页背景 + 字压在图上」，翻页只换字、正文位置固定不动；
 *      入口索引整块、「概览」「管理团队」「产品入口」那一行、联系表单
 *      都已按用户要求删除，脚本里有反向护栏守着它们别被加回来
 *
 * 断言失败会以非 0 退出，方便接进 check:all。
 *   node scripts/witkit-i18n-check.mjs
 */
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.WITKIT_BASE ?? "http://127.0.0.1:5300";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../.shots");

mkdirSync(OUT, { recursive: true });

const fails = [];
function assert(ok, label, detail) {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  × ${label}${detail ? ` — ${detail}` : ""}`);
    fails.push(label);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") fails.push(`console error: ${m.text()}`);
});

/* ══════════ 1. 语言切换 ══════════ */
console.log("\n[1] 语言切换");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const langBtns = await page.locator(".lang-btn").allTextContents();
assert(
  langBtns.join("/") === "简/繁",
  `两档按钮为 简/繁（实际：${langBtns.join("/")}）`,
);

/** 取首个导航项文字（「关于我们」），用它验证语言是否真的换了 */
async function navText() {
  return (
    await page.locator(".nav-desktop .nav-link").first().textContent()
  )?.trim();
}

const seen = {};
for (const [idx, code] of [
  [0, "zh"],
  [1, "tw"],
]) {
  await page.locator(".lang-btn").nth(idx).click();
  await page.waitForTimeout(350);
  seen[code] = {
    nav: await navText(),
    htmlLang: await page.getAttribute("html", "lang"),
  };
  await page.screenshot({
    path: `${OUT}/i18n-header-${code}.png`,
    clip: { x: 0, y: 0, width: 1440, height: 260 },
  });
}

assert(seen.zh.nav === "关于我们", `简体导航显示中文（实际：${seen.zh.nav}）`);
assert(seen.tw.nav === "關於我們", `繁体导航转为繁体（实际：${seen.tw.nav}）`);
assert(
  seen.zh.htmlLang === "zh-CN" && seen.tw.htmlLang === "zh-Hant",
  `html lang 两档同步（${seen.zh.htmlLang} / ${seen.tw.htmlLang}）`,
);

/* 刷新后语言应当记住（localStorage） */
await page.locator(".lang-btn").nth(1).click();
await page.waitForTimeout(300);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
assert((await navText()) === "關於我們", "刷新后语言选择被保留");

/* 切回简体，后面的检查都在简体下做 */
await page.locator(".lang-btn").nth(0).click();
await page.waitForTimeout(300);

/* 首页（＝关于我们）也要能跟着切（这些区块同样走 t()） */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.locator(".lang-btn").nth(1).click();
await page.waitForTimeout(400);
const aboutTw = await page.evaluate(() => ({
  company:
    document.querySelector("#company .fp-title")?.textContent?.trim() ?? "",
  conduct:
    document.querySelector("#conduct .section-title")?.textContent?.trim() ??
    "",
}));
assert(
  aboutTw.company === "公司簡介" && aboutTw.conduct === "行為準則",
  `首页繁体态翻译到位（${aboutTw.company} / ${aboutTw.conduct}）`,
);

await page.locator(".lang-btn").nth(0).click();
await page.waitForTimeout(300);

/* ══════════ 2 & 3. 产品下拉面板 ══════════ */
console.log("\n[2][3] 产品下拉面板与产品外链");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.locator(".nav-desktop .nav-item").nth(1).hover();
await page.waitForTimeout(450);
await page.screenshot({
  path: `${OUT}/i18n-product-panel.png`,
  clip: { x: 0, y: 0, width: 1440, height: 620 },
});

const panel = await page.evaluate(() => {
  const open = document.querySelector(".mega.open");
  if (!open) return { missing: true };
  const groups = [...open.querySelectorAll(".mega-col")];
  const items = [...open.querySelectorAll(".mp-item")];
  return {
    groupCount: groups.length,
    groupTitles: groups.map((g) =>
      g.querySelector(".mega-title")?.textContent?.trim(),
    ),
    itemCount: items.length,
    /* 每个条目里除产品名之外还有多少文字节点 —— 用户要求「不要有小字介绍」 */
    extraTextPerItem: items.map((a) => {
      const name = a.querySelector(".mp-name")?.textContent?.trim() ?? "";
      const all =
        a.textContent?.replace(name, "").replace("↗", "").trim() ?? "";
      return all;
    }),
    links: items.map((a) => ({
      tag: a.tagName,
      href: a.getAttribute("href") ?? "",
      target: a.getAttribute("target") ?? "",
    })),
  };
});

assert(!panel.missing, "产品面板可以展开");
assert(panel.groupCount === 4, `产品分成 4 类（实际：${panel.groupCount}）`);
/* 「一次性罗列完」= 面板里的条目数等于数据源里的产品总数（不是分页、不是截断）。
   ⚠️ 不要写死数字。原来是 `>= 12`，产品线一精简到 11 项就报红 ——
   而它要守的从来不是「至少 12 个」，是「一个都没漏」。
   期望值从 data.ts 里数出来，产品增减时断言自动跟随。 */
const expectedItems = (() => {
  const src = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../src/mocks/data.ts"),
    "utf8",
  );
  /* 数 `export const products` 到 `export const labs` 之间的 slug。
     labs 也有 slug，但它们不进产品面板，所以按这两条 export 切段。 */
  const from = src.indexOf("export const products");
  const to = src.indexOf("export const labs");
  const seg = from >= 0 && to > from ? src.slice(from, to) : "";
  return (seg.match(/slug:\s*"/g) ?? []).length;
})();
assert(
  panel.itemCount === expectedItems,
  `产品一次性罗列完（面板 ${panel.itemCount} 项 / 数据源 ${expectedItems} 项）`,
  `面板 ${panel.itemCount} 项，数据源 ${expectedItems} 项 —— 有漏项或截断`,
);
assert(
  (panel.extraTextPerItem ?? []).every((s) => s === ""),
  "每个产品条目只有名字，没有小字介绍",
  `残留：${JSON.stringify((panel.extraTextPerItem ?? []).filter((s) => s !== ""))}`,
);
assert(
  (panel.links ?? []).every((l) => l.tag === "A" && l.href.startsWith("http")),
  "产品条目是外链 <a href>（不是内部路由）",
);
assert(
  (panel.links ?? []).every((l) => l.target === "_blank"),
  "产品外链在新标签打开",
);
const domains = [
  ...new Set((panel.links ?? []).map((l) => new URL(l.href).host)),
];
console.log(`    · 指向域名：${domains.join(", ")}`);

/* ══════════ 4. 首屏大字 ══════════ */
console.log("\n[4] 首屏大字");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({
  path: `${OUT}/i18n-hero.png`,
  clip: { x: 0, y: 0, width: 1440, height: 760 },
});

const hero = await page.evaluate(() => {
  /* 首屏主张是真实 HTML 大字 .hero-title（2026-09-20 弃用立体字图，回归纯字）。 */
  const el = document.querySelector(".hero-title");
  if (!el) return { missing: true };
  const cs = getComputedStyle(el);
  const lineHeight =
    Number.parseFloat(cs.lineHeight) || Number.parseFloat(cs.fontSize) * 1.2;
  return {
    text: el.textContent?.trim(),
    fontSize: Number.parseFloat(cs.fontSize),
    height: Math.round(el.getBoundingClientRect().height),
    lines: Math.round(el.getBoundingClientRect().height / lineHeight),
    removed: {
      eyebrow: !!document.querySelector(".hero-eyebrow"),
      sub: !!document.querySelector(".hero-sub"),
      actions: !!document.querySelector(".hero-actions"),
      wordImg: !!document.querySelector(".hero-word"),
    },
    /* 首屏应有的三件东西（2026-09-20 末 单栏居中版）：
       品牌标 + 大字 + 一行英文。 */
    kept: {
      brand: !!document.querySelector(".hero-brand"),
      title: !!document.querySelector(".hero-title"),
      en: !!document.querySelector(".hero-en"),
    },
  };
});

assert(!hero.missing, "首屏大字存在");
assert(
  hero.lines === 1,
  `首屏主张只占一行（实际 ${hero.lines} 行，高 ${hero.height}px）`,
);
assert(hero.fontSize >= 40, `首屏字号仍有分量（实际 ${hero.fontSize}px）`);
/* 首屏三件套：品牌标 / 大字 / 英文行。
   ⚠️ 这条断言跟着首屏改了三版，每次都是「元素没了但断言还在」——
   写死具体元素名的正向护栏天生短命。改版时**必须回来同步这一条**，
   否则它会每次全量校验都报红，久了就没人看红字了（假红和假绿一样有害）。
   口径演进：纯黑底一行大字 → 左字右界面两栏（品牌标/大字/副标题）
   → 单栏居中（品牌标/大字/英文行）。 */
assert(
  hero.kept.brand && hero.kept.title && hero.kept.en,
  "首屏三件套齐全（品牌标 / 大字 / 英文行）",
  `实际 ${JSON.stringify(hero.kept)}`,
);
/* 反向护栏：这几样当年明确删掉过，加回来就红 */
assert(
  !hero.removed.eyebrow && !hero.removed.actions && !hero.removed.wordImg,
  "首屏不再有角标 / 按钮组 / 立体字图",
  `仍存在：${Object.entries(hero.removed)
    .filter(([k, v]) => v)
    .map(([k]) => k)
    .join(", ")}`,
);

/* ══════════ 5. 关于我们（＝首页） ══════════ */
console.log(
  "\n[5] 关于我们（公司简介 / 愿景及使命 / 企业文化 / 行为准则 / 联系我们）",
);
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/i18n-about.png`, fullPage: true });

const about = await page.evaluate(() => {
  /* 用户否过居中版式（原话：看看腾讯字体安排，不是在正中心）——
     所以这一页所有区块标题都必须左对齐。
     原来只扫 `.section-head`，索引删掉后它只剩联系一处，这条断言等于空转；
     现在按板块逐个点名取标题，覆盖全部五个区块。 */
  const HEAD_SELECTORS = [
    "#company .fp-title",
    "#vision .fp-title",
    "#culture .fp-title",
    "#culture .culture-name",
    "#conduct .section-title",
    "#contact .section-title",
  ];
  const heads = HEAD_SELECTORS.map((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, title: "", align: "缺", leftAligned: false };
    const box = el.getBoundingClientRect();
    /* 和它所在的内容块左边缘比（而不是整页容器）。
       注意不能直接量 el.getBoundingClientRect().left —— 标题是块级元素，
       就算 text-align:center，它的盒子也照样从父块左边起、铺满整行，
       量出来永远「左对齐」。必须量**文字实际占的盒**（Range 的矩形），
       居中的那几行才会明显内缩。这个坑我踩过一次。
       而且愿景那页是「图左字右」，标题在右列，跟整页容器左缘比必然错 ——
       所以要跟它自己的父块（.fp-copy / .culture-body / .section-head 等）比。 */
    const parent = el.parentElement;
    const box0 = parent?.getBoundingClientRect() ?? box;
    const pad = Number.parseFloat(
      parent ? getComputedStyle(parent).paddingLeft : "0",
    );
    const range = document.createRange();
    range.selectNodeContents(el);
    const textBox = range.getBoundingClientRect();
    return {
      sel,
      title: el.textContent?.trim() ?? "",
      align: getComputedStyle(el).textAlign,
      leftAligned: Math.abs(textBox.left - (box0.left + pad)) <= 2,
    };
  });

  /* 入口索引整块（导语 + 四项索引 + 跟随说明）已按用户要求删除。
     这里只留一个计数当护栏 —— 它一旦被加回来，下面那条断言立刻红。 */
  const indexItems = document.querySelectorAll(".ix-item").length;

  const main = document.querySelector("main");

  /* 曾经这里要先把「产品入口」那一行整块摘掉再检查正文，因为产品名允许待在那儿。
     用户已要求把那行删掉 —— 于是规则更简单：这一页正文里出现任何产品名都算违规，
     直接取 main 全文，不用再摘任何东西。 */
  const bodyText = main?.innerText ?? "";

  return {
    heads,
    indexItems,
    sectionIds: [...document.querySelectorAll("section[id]")].map((s) => s.id),
    /* 整屏页：公司简介 / 愿景及使命 / 企业文化 各占一整页。
       hasInk = 是「整页背景 + 字压在图上」那一版（**只有企业文化**该有） */
    fullPages: ["company", "vision", "culture"].map((id) => {
      const el = document.getElementById(id);
      const r = el?.getBoundingClientRect();
      return {
        id,
        height: Math.round(r?.height ?? 0),
        hasBg: !!el?.querySelector(".fp-bg"),
        hasScrim: !!el?.querySelector(".fp-scrim"),
        hasInk: !!el?.classList.contains("fp-ink"),
      };
    }),
    /* 用户要求删掉的几块：概览（业务架构清单）、管理团队、联系表单、入口索引 */
    removed: {
      overview: !!document.querySelector("#overview"),
      bizItems: document.querySelectorAll(".biz-item").length,
      team: !!document.querySelector("#team"),
      indexWrap: !!document.querySelector(".ix-wrap"),
      forms: document.querySelectorAll("#contact form, .contact-form").length,
    },
    /* 「产品入口」那一行已按用户要求删除。这两条是防止它被加回来的护栏：
       .plinks 不许存在，且正文里不许再有任何站外链接（联系我们那几个 mailto 不算）。 */
    plinksBlock: !!main?.querySelector(".plinks"),
    outboundLinks: [...(main?.querySelectorAll('a[href^="http"]') ?? [])].map(
      (a) => ({
        text: a.textContent?.replace(/[↗→]/g, "").trim() ?? "",
        href: a.getAttribute("href") ?? "",
      }),
    ),
    leakedProducts: [
      "E时代IDE",
      "E时代云服务",
      "E时代Git",
      "E时代论坛",
      "WeAuth",
      "云数据库",
      "云存储",
      "图床",
      "云剪贴板",
    ].filter((p) => bodyText.includes(p)),
    /* 联系我们从「四分类渠道」改成唯一邮箱（2026-09-20）：
       只有一个 .contact-email-value，值为唯一邮箱 zhouzihong@qifalab.cn */
    contactEmail:
      document.querySelector(".contact-email-value")?.textContent?.trim() ?? "",
    culturePoints: document.querySelectorAll(".culture-points li").length,
    conductItems: document.querySelectorAll(".conduct-item").length,
    contactGlow: !!document.querySelector(".contact-glow"),
  };
});

assert(
  about.indexItems === 0 && !about.removed.indexWrap,
  "入口索引整块（导语 + 四项索引 + 跟随说明）已删除",
  `残留 ${about.indexItems} 项 / .ix-wrap=${about.removed.indexWrap}`,
);
assert(
  about.sectionIds.join(",") === "company,vision,culture,conduct,contact",
  `锚点区块齐全（实际 ${about.sectionIds.join(",")}）`,
);
assert(
  about.fullPages.every((p) => p.height >= 860),
  "公司简介 / 愿景及使命 / 企业文化 各占一整页（≥ 视口高）",
  JSON.stringify(about.fullPages.map((p) => `${p.id}:${p.height}px`)),
);
/* 用户要求：只有企业文化是「图片上有字」，另外两页图与字分开摆 */
assert(
  about.fullPages
    .filter((p) => p.id === "culture")
    .every((p) => p.hasBg && p.hasScrim && p.hasInk),
  "企业文化是「整页背景 + 字压在图上」",
  JSON.stringify(about.fullPages.find((p) => p.id === "culture")),
);
assert(
  about.fullPages
    .filter((p) => p.id !== "culture")
    .every((p) => !p.hasBg && !p.hasInk),
  "公司简介 / 愿景及使命 不是「图片上有字」（图与字分开摆）",
  JSON.stringify(about.fullPages.filter((p) => p.id !== "culture")),
);
assert(
  !about.removed.overview && about.removed.bizItems === 0,
  "「概览」板块已整块删除",
  JSON.stringify(about.removed),
);
assert(
  !about.removed.team,
  "「管理团队」板块已删除",
  JSON.stringify(about.removed),
);
assert(
  about.removed.forms === 0,
  "「联系我们」不再有联系表单",
  `残留 ${about.removed.forms} 个`,
);
assert(
  about.heads.length === 6 &&
    about.heads.every(
      (h) => (h.align === "start" || h.align === "left") && h.leftAligned,
    ),
  `五个区块的标题全部左对齐（不是居中），共 ${about.heads.length} 处`,
  JSON.stringify(
    about.heads.filter((h) => !h.leftAligned || h.align === "center"),
  ),
);
assert(!about.plinksBlock, "首页不再有「产品入口」那一行（用户要求删除）");
assert(
  about.outboundLinks.length === 0,
  "首页正文不含任何站外产品链接",
  JSON.stringify(about.outboundLinks),
);
assert(
  about.leakedProducts.length === 0,
  "正文不含具体产品/项目名",
  `泄漏：${about.leakedProducts.join(", ")}`,
);
assert(
  about.culturePoints === 3,
  `企业文化每条给出 3 个做法（实际 ${about.culturePoints}）`,
);
assert(about.conductItems === 4, `行为准则 4 条（实际 ${about.conductItems}）`);
assert(
  about.contactEmail === "zhouzihong@qifalab.cn",
  `联系我们为唯一邮箱 zhouzihong@qifalab.cn（实际 ${about.contactEmail}）`,
);
assert(about.contactGlow, "联系我们区块有品牌色光斑");

/* 锚点直达：入口索引删了，但 `#culture` 这类锚点必须仍然有效 ——
   页脚链接、外部链接、用户手敲的 URL 都可能带 hash 过来。
   这是索引消失之后仅剩的一条走锚点的路径，必须守住。

   ⚠️ 期望值不是 0。`router.ts` 的 scrollBehavior 明确写了 `top: 88` ——
   2026-09-20 起锚点跳转要**避让固定顶栏**（顶栏实测 73px），
   所以区块顶边落在视口 88px 处是**正确行为**，不是偏移 bug。
   这条断言 2026-09-19 写的是「距顶 0px」，那是避让顶栏之前的口径；
   改了 scrollBehavior 却没回来同步它，于是每次全量校验都报红 ——
   又一处「代码改了、断言没跟」的假红。
   现在改成：读 router.ts 里的 top 值来定期望（而不是再写死一个数），
   这样以后调避让高度，断言自动跟随，不会再脱节。 */
const HASH_OFFSET = (() => {
  const src = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../src/router.ts"),
    "utf8",
  );
  const m = src.match(/el:\s*to\.hash,\s*top:\s*(\d+)/);
  return m ? Number(m[1]) : 0;
})();
await page.goto(`${BASE}/#culture`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
const anchorTop = await page.evaluate(() =>
  Math.round(
    document.getElementById("culture")?.getBoundingClientRect().top ?? -999,
  ),
);
assert(
  Math.abs(anchorTop - HASH_OFFSET) <= 8,
  `带 hash 直达锚点仍有效（#culture 距顶 ${anchorTop}px，期望 ≈${HASH_OFFSET}px 避让顶栏）`,
  `实际 ${anchorTop}px / 期望 ${HASH_OFFSET}px`,
);
await page
  .locator(".culture-nav .cn-btn")
  .first()
  .waitFor({ state: "visible" });

/* 企业文化翻页：内容真的在切，但正文块位置**不许动**
   （用户第二轮明确要求：字位置别变，就固定在一个大概位置） */
const readCulture = () =>
  page.evaluate(() => {
    const body = document.querySelector(".culture-body");
    const cs = body ? getComputedStyle(body) : null;
    /* matrix(a, b, c, d, tx, ty) —— 只关心位移那两位，应当一直是 0 */
    const m = cs?.transform?.match(/matrix\(([^)]+)\)/)?.[1].split(",") ?? [];
    return {
      name: document.querySelector(".culture-name")?.textContent?.trim() ?? "",
      idx:
        document
          .querySelector(".culture-idx")
          ?.textContent?.replace(/\s+/g, " ")
          .trim() ?? "",
      tx: Math.round(Number.parseFloat(m[4] ?? "0") || 0),
      ty: Math.round(Number.parseFloat(m[5] ?? "0") || 0),
      top: Math.round(body?.getBoundingClientRect().top ?? -1),
    };
  });

/* 企业文化有 3.5 秒自动轮播，goto 后它就开始跑。若不处理，脚本前面那一串
   操作（900ms 等待 + 读锚点 + waitFor visible）加起来正好逼近 3.5 秒边界，
   读 c1 时会撞上自动轮播的切换瞬间，读到 transition 中间态（ty=-4 这种），
   后面所有断言跟着错位 —— 这就是 flaky 的根因。

   对策：读 c1 之前先主动点一次「下一条」，这一步会触发 restartAutoPlay
   （自动轮播重新从 0 计时）并完成一次手动切换；等 350ms（transition 200ms
   已收尾）后读到的 c1 一定处于稳定态。此后「读 c2、往回读 c3」全程不到 2 秒，
   远小于 3.5 秒，自动轮播不可能中途插一脚。 */
await page.locator(".culture-nav .cn-btn").nth(1).click();
await page.waitForTimeout(350);
const c1 = await readCulture();

await page.locator(".culture-nav .cn-btn").nth(1).click();
await page.waitForTimeout(350);
const c2 = await readCulture();

assert(
  c1.name !== c2.name && !!c2.name && c1.idx !== c2.idx,
  `企业文化可翻页（${c1.name} ${c1.idx} → ${c2.name} ${c2.idx}）`,
);
assert(
  c2.tx === 0 && c2.ty === 0 && c1.tx === 0 && c1.ty === 0,
  `正文块没有位移（${c1.tx},${c1.ty} → ${c2.tx},${c2.ty}）`,
);
assert(
  Math.abs(c2.top - c1.top) <= 40,
  `翻页后正文块停在同一个大概位置（${c1.top}px → ${c2.top}px）`,
);

/* 往回翻：内容与位置都回得去 */
await page.locator(".culture-nav .cn-btn").nth(0).click();
await page.waitForTimeout(350);
const c3 = await readCulture();
assert(
  c3.name === c1.name && Math.abs(c3.top - c1.top) <= 40,
  `往回翻回得去，位置也一样（${c3.name} ${c3.top}px）`,
);

/* 翻页流程截图后置，不再夹在断言中间 */
await page.screenshot({ path: `${OUT}/i18n-culture-03.png` });

console.log(
  `    · 整屏页：${about.fullPages.map((p) => `${p.id} ${p.height}px`).join(" / ")}`,
);
console.log(
  `    · 整页背景（字压图上）：${
    about.fullPages
      .filter((p) => p.hasInk)
      .map((p) => p.id)
      .join("、") || "无"
  }`,
);

await browser.close();

console.log(
  fails.length
    ? `\n× 失败 ${fails.length} 项：\n  - ${fails.join("\n  - ")}`
    : "\n✅ 本轮改动全部通过",
);
process.exitCode = fails.length ? 1 : 0;

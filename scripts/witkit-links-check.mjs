/* 站内链接与导航归属验收。
   起因：关于页整页做完、26 条断言全过，但它挂在 /about 而导航「关于我们」指向 /，
   用户点进去看到的还是别的东西 —— 「页面能渲染」不等于「用户找得到」。
   所以这里守的是可达性 + 落点正确，补上截图断言看不出来的那一层。

   A. 每个顶栏导航项点击后，落在它该去的路径
   B. 「关于我们」落在 /（首页就是关于我们），保留首屏那行大字 +
      五个锚点区块（company/vision/culture/conduct/contact）都能直达
   C. 首页不再铺产品/服务介绍区块（用户要求关于我们不放具体产品介绍），
      也不再有「概览」板块、管理团队、联系表单、入口索引、产品入口那一行
      （均为用户要求删除；B/C 里各留了一条反向护栏守着别被加回来）
   D. 每个静态路由都有站内入口（防孤儿页）
   E. 老地址 /about 跳回 /，且 hash 不丢
   F. 页脚「关于我们」→ /
   G. 各页面面包屑首项 = 「首页 → /」
   H. logo 能回首页

   跑法：node scripts/witkit-links-check.mjs（需 dev server 在 5300） */
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5300";
const OUT = ".shots";

/* 导航项文案 → 应当落地的路径。改导航结构时同步改这里。
   「加入我们」2026-09-20 起不再独立成页，直接跳首页「联系我们」锚点。 */
const NAV_EXPECT = [
  { label: "关于我们", path: "/" },
  { label: "我们的服务", path: "/services" },
  { label: "我们的产品", path: "/products" },
  { label: "开发者", path: "/developers" },
  { label: "新闻动态", path: "/news" },
  { label: "加入我们", path: "/#contact" },
];

/* 必须有站内入口的静态路由（/about、/careers 是跳转，不算页面） */
const STATIC_ROUTES = ["/", "/services", "/products", "/developers", "/news"];

/* 带面包屑的页面 */
const CRUMB_PAGES = ["/services", "/products", "/developers", "/news"];

let failed = 0;
const assert = (ok, msg, detail) => {
  console.log(
    `${ok ? "  ✓" : "  ×"} ${msg}${detail && !ok ? `　→ ${detail}` : ""}`,
  );
  if (!ok) failed++;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

/* ── A + B：点导航，看落在哪、首页上有什么 ── */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

for (const nav of NAV_EXPECT) {
  await page
    .locator(".nav-desktop .nav-link", { hasText: nav.label })
    .first()
    .click();
  await page.waitForTimeout(450);
  /* 落点带 hash（如「加入我们」→ /#contact）：pathname + hash 一起比 */
  const full = new URL(page.url());
  const url = full.pathname + full.hash;
  assert(
    url === nav.path,
    `导航「${nav.label}」落到 ${nav.path}`,
    `实际落到 ${url}`,
  );

  if (nav.path === "/") {
    /* 首页必须就是关于我们：首屏那行大字 + 三块整屏页。
       入口索引整块（导语 + 四项索引 + 跟随说明）已按用户要求删除，
       这里改成反向护栏 —— 加回来就红。 */
    const indexResidue = await page.locator(".ix-item, .ix-wrap").count();
    assert(
      indexResidue === 0,
      "入口索引整块已删除（无 .ix-item / .ix-wrap 残留）",
      `残留 ${indexResidue} 处`,
    );

    const anchors = await page.evaluate(() =>
      [...document.querySelectorAll("section[id]")].map((s) => s.id),
    );
    assert(
      JSON.stringify(anchors) ===
        JSON.stringify(["company", "vision", "culture", "conduct", "contact"]),
      "首页五个锚点区块齐全（索引删了，锚点仍要能直达）",
      `实际 ${anchors.join(",")}`,
    );

    /* 用户要求删掉的几块，删干净了没有：
       概览（业务架构清单）、管理团队、联系表单、产品入口那一行 */
    const removed = await page.evaluate(() => ({
      overview: !!document.querySelector("#overview"),
      biz: document.querySelectorAll(".biz-item").length,
      team: !!document.querySelector("#team"),
      form: document.querySelectorAll("#contact form, .contact-form").length,
      plinks: !!document.querySelector(".plinks"),
      vp: !!document.querySelector(".hero"),
    }));
    assert(
      !removed.overview &&
        removed.biz === 0 &&
        !removed.team &&
        !removed.plinks,
      "「概览」「管理团队」「产品入口」都已整块删除",
      JSON.stringify(removed),
    );
    assert(
      removed.form === 0,
      "「联系我们」不再有表单",
      `残留 ${removed.form} 个表单`,
    );

    /* 首屏主张是真实 HTML 大字 .hero-title（2026-09-20 弃用立体字图，回归纯字）。
       ⚠️ 首屏已改成**单栏居中**（纯黑底 + 品牌名 / 大字 / 英文行三行居中），
       当年的「左字右界面」两栏连同 .hero-copy / .hero-demo 一起删掉了 ——
       所以「大字与右侧界面留净间距」那条断言没有了对象：两个元素都取不到，
       gapToDemo 恒为 null，`(null ?? 0) >= 24` 永远红。
       这类「元素没了但断言还在」比假绿更烦人：它每次全量校验都报红，
       久了就没人看红字了。判断依据就是 .hero-demo 在 src 里 0 处命中。
       现在真正要守的是两条与设计无关的不变量：
         a) 大字是 nowrap，**不能越出视口** —— 撑破就是横向滚动条；
         b) 字号不能小到失去主张的分量（只留一个下限兜底）。 */
    const hero = await page.evaluate(() => {
      const el = document.querySelector(".hero-title");
      if (!el) return null;
      const cs = getComputedStyle(el);
      const lh =
        Number.parseFloat(cs.lineHeight) ||
        Number.parseFloat(cs.fontSize) * 1.2;
      const tr = el.getBoundingClientRect();
      return {
        kind: "text",
        text: el.textContent.trim(),
        lines: Math.round(tr.height / lh),
        size: Math.round(Number.parseFloat(cs.fontSize)),
        /* 负值 = 还有余量；正值 = 越出多少 */
        overflowsViewport: Math.round(tr.right - window.innerWidth),
        leftGap: Math.round(tr.left),
      };
    });
    assert(
      hero?.text === "以科技聚力改变未来",
      "首屏保留「以科技聚力改变未来」",
      `实际 ${hero?.text}`,
    );
    assert(hero?.lines === 1, "首屏大字保持一行", `实际 ${hero?.lines} 行`);
    assert(
      (hero?.overflowsViewport ?? 0) <= 1,
      "首屏大字不越出视口（nowrap 大字会撑破出滚动条）",
      `越出 ${hero?.overflowsViewport}px`,
    );
    assert(
      (hero?.leftGap ?? -1) >= 0,
      "首屏大字左侧不越界",
      `左侧位置 ${hero?.leftGap}px`,
    );
    assert(
      (hero?.size ?? 0) >= 40,
      "首屏大字仍有主张的分量",
      `实际 ${hero?.size}px`,
    );

    const mainText = (await page.locator("main").innerText()).trim();
    const leaked = ["产品矩阵", "三大体系，一套技术闭环", "配套工具"].filter(
      (w) => mainText.includes(w),
    );
    assert(
      leaked.length === 0,
      "首页没有产品/服务介绍区块",
      `残留：${leaked.join("、")}`,
    );
  } else if (nav.path === "/news") {
    /* 新闻页里一条编造的内容都不留了，等真实稿件 —— 所以这里不能按「正文够长」判。
       合法的空态也该算通过：只要它是**设计过的**（有标题 + 说明 + 出口按钮），
       不是白屏、不是报错、不是转圈。 */
    const news = await page.evaluate(() => {
      const text = (document.querySelector("main")?.innerText ?? "").trim();
      return {
        len: text.length,
        emptyState: !!document.querySelector(".blank-title"),
        title: document.querySelector(".page-title")?.textContent?.trim() ?? "",
        actions: document.querySelectorAll(".blank-actions a").length,
        errorBlocks: document.querySelectorAll(".state-error").length,
      };
    });
    assert(
      news.len > 60 &&
        news.emptyState &&
        news.errorBlocks === 0 &&
        news.actions >= 2 &&
        !!news.title,
      "/news 是设计过的空态（真实稿件还没来），不是白屏或报错",
      JSON.stringify(news),
    );
  } else {
    const len = (await page.locator("main").innerText()).trim().length;
    assert(len > 200, `${nav.path} 有实际内容`, `正文只有 ${len} 字`);
  }

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
}
await page.screenshot({ path: `${OUT}/links-home.png` });

/* ── D：孤儿页检查 —— 首页上能点到的站内链接集合 ── */
const reachable = await page.evaluate(() => {
  const set = new Set();
  for (const a of document.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto")) continue;
    set.add(href.split("#")[0].split("?")[0]);
  }
  return [...set];
});
for (const r of STATIC_ROUTES) {
  assert(
    reachable.includes(r),
    `路由 ${r} 有站内入口（非孤儿页）`,
    `首页上能点到：${reachable.join(" ")}`,
  );
}

/* ── E：老地址 /about 跳回 /，hash 不丢 ── */
await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
assert(
  new URL(page.url()).pathname === "/",
  "老地址 /about 跳回 /",
  `停在 ${page.url()}`,
);

await page.goto(`${BASE}/about#contact`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const afterHash = new URL(page.url());
assert(
  afterHash.pathname === "/" && afterHash.hash === "#contact",
  "老地址带 hash（/about#contact）也跳对且不丢锚点",
  `停在 ${page.url()}`,
);

/* ── F：页脚「关于我们」 ── */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const footerHref = await page
  .locator("footer a", { hasText: "关于我们" })
  .first()
  .getAttribute("href")
  .catch(() => null);
assert(footerHref === "/", "页脚「关于我们」指向 /", `实际 ${footerHref}`);

/* ── G：面包屑首项是「首页」且指向 / ── */
for (const path of CRUMB_PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const first = await page
    .locator(".crumb a")
    .first()
    .evaluate((el) => ({
      text: el.textContent.trim(),
      href: el.getAttribute("href"),
    }))
    .catch(() => null);
  assert(
    first?.text === "首页" && first.href === "/",
    `${path} 面包屑首项是「首页 → /」`,
    first ? `实际「${first.text}」→ ${first.href}` : "没找到面包屑",
  );
}

/* ── H：logo 回首页 ── */
await page.goto(`${BASE}/news`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.locator("header .logo, header a").first().click();
await page.waitForTimeout(450);
assert(
  new URL(page.url()).pathname === "/",
  "点 logo 回到首页",
  `实际 ${page.url()}`,
);

await browser.close();
console.log(
  failed === 0 ? "\n✅ 站内链接与导航归属全部正确" : `\n⚠ ${failed} 条不通过`,
);
process.exit(failed === 0 ? 0 : 1);

<script setup lang="ts">
/**
 * 我们的服务 —— 三大自研技术体系
 *
 * 这一页回答一个问题：妙计科技到底「卖」什么。
 * 答案不是单个功能，而是三层可复用能力：HEC（互联与授权）、UEF（全栈工程与 AI）、
 * CEP（企业级云）。产品都是从这三层里长出来的。
 *
 * 页面节奏（用户多轮点名调过，2026-09-20 定稿）：
 *   页头 → 总览图（整屏一页）→ 三大体系详情 → 三层怎么咬合 → CTA「想接入其中一层？」
 *   CTA 先后挪过两次：最初挂页尾，一轮挪到总览图之后，最终定稿「介绍完三个体系再出现」，
 *   且改成普通浅色区块 —— 不再深色底 + 蓝图网格（用户：「不要做成格子和深色，就正常就行」）。
 *
 * 每个体系配一个大图位（systems/{slug}），是可替换为成品渲染图的位置。
 *
 * 文案口径（用户要求「有底气，别像 AI 写的」）：
 *   只写我们做了什么、边界在哪，不写「赋能 / 全链路 / 深度集成 / 打造闭环」这类词；
 *   能用具体数字与具体动作说清的，不用形容词。
 */
import { onMounted, ref } from "vue";
import { api } from "../api/client";
import type { ProductDetail, TechSystemDetail } from "../api/types";
import ImageSlot from "../components/ImageSlot.vue";
import BlueprintGrid from "../components/deco/BlueprintGrid.vue";
import CrossMark from "../components/deco/CrossMark.vue";
import HeroSpec from "../components/deco/HeroSpec.vue";
import { t } from "../i18n";

const loading = ref(true);
const error = ref<string | null>(null);
const systems = ref<TechSystemDetail[]>([]);
const products = ref<ProductDetail[]>([]);

/* 协作关系：三层各承担一类职责，层间接口固定，单一变更不穿透他层 */
const loop = [
  {
    code: "HEC",
    role: "身份与授权",
    desc: "统一身份与授权，认证结果跨产品复用。",
  },
  {
    code: "UEF",
    role: "工程与 AI",
    desc: "从代码到上线共用一套运行时与编排，AI 参与治理。",
  },
  {
    code: "CEP",
    role: "数据与存储",
    desc: "数据库、对象存储与人机验证，共用一套配额与监控。",
  },
];

onMounted(async () => {
  try {
    const [techRes, prodRes] = await Promise.all([
      api.listTechSystems(),
      api.listProducts(),
    ]);
    systems.value = techRes.items ?? [];
    products.value = prodRes.items ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : t("加载失败");
  } finally {
    loading.value = false;
  }
});

function relatedProducts(slug: string) {
  return products.value.filter((p) => p.tech_system === slug).slice(0, 4);
}
</script>

<template>
  <div class="page">
    <!-- ═══ 页头 ═══ -->
    <section class="page-hero">
      <BlueprintGrid variant="cross" :size="88" :fade="true" />
      <HeroSpec label="技术体系" code="01" />
      <div class="container-page inner">
        <nav class="crumb" :aria-label="t('面包屑')">
          <RouterLink to="/">{{ t("首页") }}</RouterLink>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ t("我们的服务") }}</span>
        </nav>

        <p class="page-label">{{ t("我们的服务") }}</p>
        <h1 class="page-title">{{ t("三大自研技术体系") }}</h1>
        <!-- 整段写在一个 t("…") 里、句子不换行：
             裸文本节点跨行时 HTML 会在断点插入空格，中文里会多出一个可见的缝。
             术语口径与总览图（services/overview.svg）严格一致：SSO、OAuth 2.0、
             编排、灰度、RAG —— 图上写什么，这里就写什么，不让图和正文各说一套。
             长度也调过：860px 行宽下正好三行，末行不留孤字。改文案要重新量行数。 -->
        <p class="page-desc">
          {{
            t(
              "身份互联、全栈工程与企业级云拆成三层独立体系：HEC 以 SSO 与 OAuth 2.0 统一身份与授权，UEF 承担从代码到上线的编排与灰度发布，CEP 提供 MySQL / PostgreSQL 双引擎、S3 兼容存储与 PoW 验证。接口定在体系内部，产品只写业务逻辑，多一个产品，不多造一遍底座。",
            )
          }}
        </p>
      </div>
    </section>

    <!-- ═══ 体系总览图：整屏一页 ═══
         这一页只放一张图（用户要求「占满一页，但显示全面、别裁切」）。
         图是按 1600 × 900 画的矢量图，容器铺满一屏、图用 contain 完整放入：
         16:9 的图在宽屏下左右顶满、上下留一点白，比例不符也不裁切。
         原先叠在图底的「示意图：…」标注条已删（用户：「示意图的这些东西都不要」）。 -->
    <section id="map" class="map-fp">
      <div class="map-stage" v-reveal>
        <!-- 图片位 services/overview · 1600 × 900 px（16:9）。
             ratio="auto" 让图片位填满整屏容器（fill 模式），
             下面再用 contain 让 16:9 的图完整显示、不被裁切。 -->
        <ImageSlot
          slot="services/overview"
          ratio="auto"
          :alt="t('三大技术体系总览图')"
        />
      </div>
    </section>

    <!-- ═══ 状态 ═══ -->
    <section v-if="loading || error" class="section">
      <div class="container-page">
        <p v-if="loading" class="state">{{ t("正在加载服务体系…") }}</p>
        <p v-else class="state state-error">{{ error }}</p>
      </div>
    </section>

    <!-- ═══ 三大体系 ═══
         容器放宽到 w-wide（1400px）、图列加宽到 1.15fr、图位不再套卡片框 ——
         用户：「图片太小了」「架构图直接给出，不要四周白色边框」。 -->
    <section v-else class="section">
      <div class="container-page systems-wrap">
        <div class="systems">
          <article
            v-for="(ts, i) in systems"
            :key="ts.slug"
            v-reveal
            class="system"
            :class="{ 'is-reversed': i % 2 === 1 }"
          >
            <!-- 图侧：图片位 systems/{slug} · 1600 × 1000 px（8:5）。
                 直接给图，不套卡片框 —— 图是按整幅画布画的，
                 套框会把图压缩进内边距里，白白缩小一圈。 -->
            <div class="system-visual">
              <ImageSlot :slot="`systems/${ts.slug}`" :alt="t('{name} 体系架构图', { name: ts.name })" />
            </div>

            <!-- 文侧：编号 / 名称 / 一句话定位 / 一段说明，末尾用关键指标贴底。
                 能力清单已挪到图下方（用户 2026-09-20：「可以移动部分文字到图片下面，
                 放大图片」），文字列因此收窄、宽度让给图；
                 指标留在文字列贴底，是为了让这一列高度与图对齐，否则列底会空一大块。 -->
            <div class="system-body">
              <div class="system-body-main">
                <div class="system-head">
                  <span class="system-index tnum">{{ String(i + 1).padStart(2, "0") }}</span>
                  <CrossMark :size="11" accent />
                </div>

                <!-- 标题即入口（用户 2026-09-20）：「点击 HEC 跳转到导航栏点 HEC 那个页面」。
                     落点与顶栏「服务 → HEC」、本页底部「查看 HEC 技术细节 →」完全一致。
                     链接做在整行（h2 是块级 flex，撑满文字列宽），热区比只让 3 个字母可点好按得多；
                     aria-label 用一句完整动作，读屏时不会只念出一串代号。 -->
                <RouterLink
                  :to="`/tech/${ts.slug}`"
                  class="system-title-link"
                  :aria-label="t('查看 {name} 技术细节', { name: ts.name })"
                >
                  <h2 class="system-name">
                    {{ ts.name }}
                    <span class="system-full">{{ ts.full_name }}</span>
                    <span class="system-go" aria-hidden="true">→</span>
                  </h2>
                </RouterLink>
                <p class="system-sub">{{ t(ts.description) }}</p>
                <p class="system-desc">{{ t(ts.long_description) }}</p>
              </div>

              <div class="system-metrics">
                <div v-for="m in ts.metrics" :key="m.label" class="sm-item">
                  <span class="sm-value tnum">{{ m.value }}<i v-if="m.unit">{{ m.unit }}</i></span>
                  <span class="sm-label">{{ t(m.label) }}</span>
                </div>
              </div>
            </div>

            <!-- 图下方：能力清单 + 产品入口，横跨两列。
                 脚注横跨两列，所以左右交错翻转时它不跟着翻 —— 用户明确要求交错保持原样。 -->
            <div class="system-foot">
              <ul class="system-features">
                <li v-for="f in ts.features" :key="f.title">
                  <span class="dot"></span>
                  <strong>{{ t(f.title) }}</strong>
                  <span class="feature-desc">{{ t(f.description) }}</span>
                </li>
              </ul>

              <div class="system-foot-bar">
                <div v-if="relatedProducts(ts.slug).length" class="system-products">
                  <span class="sp-label">{{ t("体系支撑的产品") }}</span>
                  <div class="sp-list">
                    <a
                      v-for="p in relatedProducts(ts.slug)"
                      :key="p.slug"
                      :href="p.url ?? undefined"
                      target="_blank"
                      rel="noopener"
                      class="sp-chip"
                    >
                      {{ t(p.name) }}
                      <span class="sp-chip-arrow" aria-hidden="true">↗</span>
                    </a>
                  </div>
                </div>

                <RouterLink :to="`/tech/${ts.slug}`" class="link-arrow system-link">
                  {{ t("查看 {name} 技术细节", { name: ts.name }) }}
                  <span class="arrow">→</span>
                </RouterLink>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ═══ 三层怎么咬合 ═══ -->
    <section class="section section-subtle">
      <div class="container-page">
        <header class="section-head" v-reveal>
          <p class="section-label">{{ t("协作方式") }}</p>
          <h2 class="section-title">{{ t("三层各司其职，接口固定") }}</h2>
          <p class="section-desc">
            {{ t("HEC 负责身份与授权，UEF 负责工程与 AI，CEP 负责数据与存储。层间接口在体系内部定义，任一产品迭代不穿透他层。") }}
          </p>
        </header>

        <ol class="loop" v-reveal>
          <li v-for="(l, i) in loop" :key="l.code" class="loop-item">
            <div class="loop-head">
              <span class="loop-index tnum">{{ String(i + 1).padStart(2, "0") }}</span>
              <span class="loop-code">{{ l.code }}</span>
              <span class="loop-role">{{ t(l.role) }}</span>
            </div>
            <span class="loop-desc">{{ t(l.desc) }}</span>
          </li>
        </ol>
      </div>
    </section>

    <!-- ═══ CTA：介绍完三个体系再收口 ═══
         位置是用户定稿的 —— 先后挪过两次，最终「放在介绍完三个之后」；
         浅色普通区块，不再深色底 + 网格。 -->
    <section class="cta">
      <div class="container-page cta-inner" v-reveal>
        <h2 class="cta-title">{{ t("想接入其中一层？") }}</h2>
        <p class="cta-desc">
          {{ t("统一登录、AI 能力、云资源，哪一层都可以单独接入，不必先接下整套体系。") }}
        </p>
        <div class="cta-actions">
          <RouterLink to="/#contact" class="btn btn-primary">{{ t("聊聊接入方案") }}</RouterLink>
          <RouterLink to="/products" class="btn btn-secondary">{{ t("先看产品") }}</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ═══ 页头：占满一屏（产品页 / 开发者页同一套版式） ═══
   用户：「一点进去那个页面要把整个页面占满，下面正文的标题都看到了很不协调。」
   于是页头做成整屏：面包屑贴顶、标题簇居中、数字条贴底 ——
   首屏不再露出下面那张总览图的上半截。
   用 min-height 不用 height：内容比视口高时（窄屏、放大字号）照样撑得开；
   svh 兜住移动端浏览器工具栏收放引起的视口跳动。 */
.page-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100svh;
  padding: 132px 0 var(--space-8);
  border-bottom: 1px solid var(--color-line);
  /* 页头背景点缀：两团极淡的品牌蓝光晕，呼应首屏蓝光语言又不过分。
     网格底纹叠加其上，仍走工程图纸路线。 */
  background:
    radial-gradient(48% 42% at 84% 8%, var(--color-accent-soft), transparent 72%),
    radial-gradient(36% 32% at 6% 92%, var(--color-accent-soft), transparent 72%);
  overflow: hidden;
}

.inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.crumb {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
  font-size: var(--font-size-sm);
  color: var(--color-ink-tertiary);
}

.crumb a:hover {
  color: var(--color-accent);
}

.crumb-current {
  color: var(--color-ink);
  font-weight: 500;
}

/* 标题簇位置：数字条已删（用户：「这个不要」），页头底部不再有内容。
   曾经用单个 margin-top:auto 把标题簇推到偏下，用户后来指出「大标题太靠下了」——
   改成 vh 上边距把簇固定在面包屑下方、页头中上部，随视口高度自动收窄。 */
.page-label {
  margin-top: clamp(40px, 9vh, 110px);
  font-size: var(--font-size-sm);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-accent);
  margin-bottom: var(--space-3);
}

/* 标题放大：页头占满一屏后 60px 显得单薄（用户：「宽了之后有点空，标题可以大一些」）。
   上限 72px，与产品页 / 技术体系页同档。 */
.page-title {
  position: relative;
  max-width: 20ch;
  padding-left: var(--space-5);
  font-size: clamp(38px, 5.2vw, 72px);
  font-weight: 600;
  line-height: var(--font-line-height-tight);
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

/* 大标题左侧一条品牌蓝强调竖条（与产品页同款） */
.page-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.12em;
  bottom: 0.12em;
  width: 4px;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
}

/* 导语行宽放到 w-prose（860px）：整屏页头下 780px 右侧空出一截。
   术语变多、句子变长，行宽放开后不至于挤成四五行。
   颜色用主文字黑（--color-ink）而非次要灰 —— 用户：「小字颜色深一些」。 */
.page-desc {
  max-width: var(--layout-w-prose);
  margin-top: var(--space-5);
  font-size: var(--font-size-lg);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink);
  /* 标题簇已由 .page-label 的 vh 上边距定在页头上部，这里不再补底部余量。 */
}

/* ═══ 总览图：整屏一页，图完整显示 ═══
   这一页只有一张图。图自己带着白底、点阵与图纸边框。
   用户要求「占满一页」但「别显示不全」—— 去掉卡片框、圆角与最大宽限制，
   容器铺满整个视口，图用 contain 完整放进一屏：
   16:9 的图在宽屏下左右顶满、上下留白；比例不符时也不裁切，整张都看得见。 */
.map-fp {
  position: relative;
  min-height: 100vh;
  padding: 0;
  background: var(--color-bg-subtle);
  border-bottom: 1px solid var(--color-line);
}

/* 全屏铺满：容器吃满视口，图按 contain 完整显示（不裁切）。 */
.map-stage {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
}

/* contain：整张图都放得下。图的底色是白的、边上是浅灰背景，
   两者挨着不突兀；真出现上下留白（16:9 图在超宽屏）时也自然。 */
.map-stage :deep(.img) {
  object-fit: contain;
}

/* ═══ 体系区块 ═══
   容器放宽到 w-wide，正文更靠近屏幕两边（用户：「靠近两边一些些」）。
   图列比例 1.9fr → 2.4fr（用户：「图片再往两边靠一些」）：
   体系图是矢量图纸，字号是按画布定的，图拿到多少像素宽，读者就看到多大的字 ——
   823px 下 28px 的画布字只剩 14px，加宽到 910px 才够看。
   文字列相应收窄；它现在只剩「编号 + 名称 + 一句话 + 一段说明 + 指标」，
   能力清单早在 2026-09-20 就挪到图下方横跨两列了，收窄不会挤。 */
.systems-wrap {
  max-width: var(--layout-w-wide);
}

.systems {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
}

/* 两列网格：上排「图 | 文」，下排「脚注（能力清单 + 产品入口）」横跨两列。
   图列 1.9fr / 文字列 1fr —— 用户 2026-09-20 反馈「图片太小了」。
   把能力清单挪到图下方之后，文字列只剩「编号 + 名称 + 一句话 + 一段说明 + 指标」，
   宽度再占那么多就是浪费，所以大头全部让给图。 */
.system {
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) minmax(0, 1fr);
  grid-template-areas:
    "visual body"
    "foot   foot";
  align-items: stretch;
  column-gap: var(--space-8);
  row-gap: var(--space-7);
}

.system.is-reversed {
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.4fr);
  grid-template-areas:
    "body visual"
    "foot foot";
}

.system-visual {
  grid-area: visual;
  position: relative;
}

/* 文侧：整列拉成 flex 纵列，正文块在上、指标块贴底（margin-top:auto）。
   这样文字列高度自动跟图对齐，列底不会留一块空白 ——
   用 align-self:stretch 撑开，而不是让内容自己决定高度。 */
.system-body {
  grid-area: body;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.system-body-main {
  display: flex;
  flex-direction: column;
}

/* 脚注横跨两列，所以左右交错时它不跟着翻 —— 用户明确要求交错保持原样。 */
.system-foot {
  grid-area: foot;
}

.system-head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.system-index {
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-accent);
}

/* 标题链接：整行可点。做在块级 <a> 上而不是只包 h2 里的字，
   热区从左边缘一直到右边缘，不用瞄准三个字母。 */
.system-title-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.system-name {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--font-size-4xl);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
  transition: color var(--motion-duration-fast) var(--motion-ease-out);
}

.system-title-link:hover .system-name {
  color: var(--color-accent);
}

/* 箭头默认藏着，hover / 键盘聚焦时才滑出来 ——
   页面底部已经有一条常驻的「查看 XX 技术细节 →」，
   标题上再挂一个常驻箭头就重复了。 */
.system-go {
  font-size: var(--font-size-xl);
  font-weight: 400;
  color: var(--color-accent);
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity var(--motion-duration-fast) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out);
}

.system-title-link:hover .system-go,
.system-title-link:focus-visible .system-go {
  opacity: 1;
  transform: none;
}

.system-full {
  font-size: var(--font-size-base);
  font-weight: 400;
  letter-spacing: 0;
  color: var(--color-ink-tertiary);
}

.system-sub {
  margin-top: var(--space-3);
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-accent);
}

.system-desc {
  margin-top: var(--space-4);
  font-size: var(--font-size-base);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

/* 能力清单：横排铺在图下方，两列。
   每条 = 蓝点 + 加粗标题 + 说明，三者在同一基线上连排，一条只占 1–2 行；
   原来竖着堆在窄列里，光标题就占 3 行高。 */
.system-features {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4) var(--space-7);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-line);
}

/* ⚠️ 必须用 flex 而不是 grid：grid 两列时 feature-desc 会被自动放到第二行第一列，
   那一列是 auto 宽，说明文字被挤成 7 行。flex + flex:none 才能让三者同排。 */
.system-features li {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.system-features .dot {
  width: 4px;
  height: 4px;
  flex: none;
  align-self: center;
  border-radius: var(--radius-full);
  background: var(--color-accent);
}

.system-features strong {
  flex: none;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-ink);
}

.feature-desc {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  line-height: var(--font-line-height-normal);
  color: var(--color-ink-secondary);
}

/* 指标贴底：margin-top:auto 吃掉剩余空间。上面加一条细线，与正文分开。 */
.system-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6) var(--space-7);
  margin-top: auto;
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-line);
}

.sm-value {
  display: block;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-ink);
}

.sm-value i {
  font-style: normal;
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
  margin-left: 1px;
}

.sm-label {
  display: block;
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-ink-tertiary);
}

/* 入口行：左边产品 chip、右边详情链接，两端对齐。 */
.system-foot-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5) var(--space-7);
  margin-top: var(--space-6);
}

.system-products {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
}

.sp-label {
  font-size: var(--font-size-xs);
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

.sp-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.sp-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
  background: var(--color-accent-soft);
  border-radius: var(--radius-sm);
  transition: color var(--motion-duration-fast) var(--motion-ease-out);
}

/* 外链标记：淡显，悬停变蓝并往右上走 */
.sp-chip-arrow {
  font-size: var(--font-size-xs);
  opacity: 0.45;
  transition:
    opacity var(--motion-duration-fast) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out);
}

.sp-chip:hover {
  color: var(--color-accent);
}

.sp-chip:hover .sp-chip-arrow {
  opacity: 1;
  transform: translate(1px, -1px);
}

.system-link {
  margin-top: 0;
}

/* ═══ 咬合关系 ═══
   去掉卡片框 + 圆角 + 悬浮箭头 —— 那是 SaaS 模板的廉价套路。
   改成三列文字列表：顶部一条细分隔线，编号 + 代号 + 一句话定位排在同一行，
   说明放在下面。专业感来自对齐和留白，不来自装饰。 */
.loop {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-7);
  border-top: 1px solid var(--color-line-strong);
  padding-top: var(--space-6);
}

.loop-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-right: var(--space-7);
  border-right: 1px solid var(--color-line);
}

.loop-item:last-child {
  border-right: none;
  padding-right: 0;
}

.loop-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.loop-index {
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

.loop-code {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-accent);
}

.loop-role {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-ink);
}

.loop-desc {
  font-size: var(--font-size-sm);
  line-height: var(--font-line-height-normal);
  color: var(--color-ink-secondary);
}

/* ═══ 状态 ═══ */
.state {
  padding: var(--space-8) 0;
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-ink-tertiary);
}

.state-error {
  color: var(--color-status-danger);
}

/* ═══ CTA ═══
   浅色普通区块（用户：「不要做成格子和深色，就正常就行」），
   与前面咬合区的浅灰底自然分层，不再需要 BlueprintGrid。 */
.cta {
  padding: var(--space-10) 0;
}

.cta-inner {
  max-width: 720px;
}

.cta-title {
  font-size: var(--font-size-4xl);
  font-weight: 600;
  line-height: var(--font-line-height-tight);
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.cta-desc {
  margin-top: var(--space-4);
  font-size: var(--font-size-lg);
  color: var(--color-ink-secondary);
}

.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-7);
}

/* ═══ 响应式 ═══ */
@media (max-width: 1024px) {
  /* 单列：图 → 文字 → 脚注，交错失效（窄屏没有左右可分）。 */
  .system,
  .system.is-reversed {
    grid-template-columns: 1fr;
    grid-template-areas:
      "visual"
      "body"
      "foot";
    gap: var(--space-6);
  }
  .system-features {
    grid-template-columns: 1fr;
  }
  .systems {
    gap: var(--space-9);
  }
  .loop {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }
  .loop-item {
    padding-right: 0;
    border-right: none;
    border-bottom: 1px solid var(--color-line);
    padding-bottom: var(--space-6);
  }
  .loop-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

@media (max-width: 768px) {
  .page-hero {
    padding-top: 104px;
  }
  .page-desc {
    font-size: var(--font-size-base);
  }
  .system-name {
    font-size: var(--font-size-3xl);
  }
  .system-metrics {
    gap: var(--space-6);
  }
  .cta-title {
    font-size: var(--font-size-3xl);
  }
  .cta-desc {
    font-size: var(--font-size-base);
  }
}
</style>

<script setup lang="ts">
/**
 * 我们的产品
 *
 * 分层展示：核心产品（有独立界面，配界面截图位）× 生态工具（轻量，列表呈现不配图）。
 * 「最牛的几个」= featured 的那六个，置顶在第一屏；其余核心产品排在后面。
 */
import { computed, onMounted, ref } from "vue";
import { api } from "../api/client";
import type { ProductDetail, TechSystemDetail } from "../api/types";
import ImageSlot from "../components/ImageSlot.vue";
import BlueprintGrid from "../components/deco/BlueprintGrid.vue";
import HeroSpec from "../components/deco/HeroSpec.vue";
import { t } from "../i18n";

const loading = ref(true);
const error = ref<string | null>(null);
const products = ref<ProductDetail[]>([]);
/* 组合区块右侧由「一张总览示意图」换成「三大体系入口」：
   数据直接取技术体系列表（单源），名称/全称/定位都跟服务页同源，
   不在这里另抄一份文案 —— 抄一遍就多一处要同步的地方。 */
const systems = ref<TechSystemDetail[]>([]);

/* 旗舰在前，其余核心产品按原名次跟在后面 */
const coreProducts = computed(() => {
  const core = products.value.filter((p) => p.category !== "ecosystem");
  return [
    ...core.filter((p) => p.featured),
    ...core.filter((p) => !p.featured),
  ];
});

const ecosystem = computed(() =>
  products.value.filter((p) => p.category === "ecosystem"),
);

const statusText: Record<string, string> = {
  live: "运行中",
  beta: "内测",
  planned: "规划中",
};

onMounted(async () => {
  try {
    const [res, sys] = await Promise.all([
      api.listProducts(),
      api.listTechSystems(),
    ]);
    products.value = res.items ?? [];
    systems.value = sys.items ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : t("加载失败");
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page">
    <!-- ═══ 页头 ═══ -->
    <section class="page-hero">
      <BlueprintGrid variant="cross" :size="88" :fade="true" />
      <HeroSpec label="产品矩阵" code="02" />
      <div class="container-page inner">
        <nav class="crumb" :aria-label="t('面包屑')">
          <RouterLink to="/">{{ t("首页") }}</RouterLink>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ t("我们的产品") }}</span>
        </nav>

        <p class="page-label">{{ t("我们的产品") }}</p>
        <h1 class="page-title">{{ t("从开发环境到云端底座") }}</h1>
        <!-- 句子不换行：裸文本节点跨行会被 HTML 插进一个空格（中文里看得见）。
             术语全部来自项目已有事实（UEF/CEP/HEC 三层、配额与监控共用、账号体系），
             不引入产品实际不具备的能力。
             注意别写「分别由…支撑」—— 四个环节对三层体系不是一一映射，那是伪精确。 -->
        <p class="page-desc">
          {{
            t(
              "产品覆盖开发环境、部署运行、身份认证与数据存储四个环节，由 UEF、CEP、HEC 三层体系支撑。同一能力在体系内仅实现一次，各产品共用统一的账号体系、配额策略与监控口径。下列产品均已上线运行。",
            )
          }}
        </p>
      </div>
    </section>

    <!-- ═══ 状态 ═══ -->
    <section v-if="loading || error" class="section">
      <div class="container-page">
        <p v-if="loading" class="state">{{ t("正在加载产品…") }}</p>
        <p v-else class="state state-error">{{ error }}</p>
      </div>
    </section>

    <template v-else>
      <!-- ═══ 核心产品 ═══ -->
      <section class="section">
        <div class="container-page">
          <header class="section-head" v-reveal>
            <p class="section-label">{{ t("核心产品") }}</p>
            <h2 class="section-title">{{ t("从开发到上线的产品矩阵") }}</h2>
            <p class="section-desc">
              {{ t("各产品均有独立站点与文档，卡片直接指向对应产品。") }}
            </p>
          </header>

          <div class="grid">
            <!-- 产品卡直接跳产品自己的站点（新窗口），不做站内中转页 -->
            <a
              v-for="(p, i) in coreProducts"
              :key="p.slug"
              v-reveal="60 * i"
              :href="p.url ?? undefined"
              target="_blank"
              rel="noopener"
              class="card card-hover product"
            >
              <!-- 界面截图位：products/{slug} · 1440 × 900 px（16:10） -->
              <div class="product-visual">
                <ImageSlot
                  size="sm"
                  :slot="`products/${p.slug}`"
                  :alt="t('{name} 界面截图', { name: p.name })"
                />
                <span v-if="p.featured" class="pin">{{ t("旗舰") }}</span>
              </div>

              <div class="product-body">
                <div class="product-top">
                  <div class="product-heading">
                    <span class="product-index tnum">{{ String(i + 1).padStart(2, "0") }}</span>
                    <h3 class="product-name">{{ t(p.name) }}</h3>
                  </div>
                  <span class="status" :class="`is-${p.status}`">
                    <i class="status-dot"></i>{{ t(statusText[p.status]) }}
                  </span>
                </div>
                <p class="product-desc">{{ t(p.description) }}</p>
                <div class="product-tags">
                  <span v-for="tag in p.tags.slice(0, 3)" :key="tag" class="tag">{{ t(tag) }}</span>
                </div>
                <span class="link-arrow product-link">
                  {{ t("访问产品站点") }} <span class="arrow">↗</span>
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <!-- ═══ 生态工具 ═══ -->
      <section v-if="ecosystem.length" class="section section-subtle">
        <div class="container-page">
          <header class="section-head" v-reveal>
            <p class="section-label">{{ t("生态工具") }}</p>
            <h2 class="section-title">{{ t("面向具体场景的轻量工具") }}</h2>
            <p class="section-desc">
              {{ t("每个聚焦一个具体场景，功能边界明确，均已上线运行。") }}
            </p>
          </header>

          <div class="eco" v-reveal>
            <a
              v-for="(p, i) in ecosystem"
              :key="p.slug"
              :href="p.url ?? undefined"
              target="_blank"
              rel="noopener"
              class="eco-row"
            >
              <span class="eco-index tnum">{{ String(i + 1).padStart(2, "0") }}</span>
              <span class="eco-name">{{ t(p.name) }}</span>
              <span class="eco-desc">{{ t(p.description) }}</span>
              <span class="eco-tags">
                <span v-for="tag in p.tags.slice(0, 2)" :key="tag" class="tag">{{ t(tag) }}</span>
              </span>
              <span class="eco-arrow">↗</span>
            </a>
          </div>
        </div>
      </section>

      <!-- ═══ 组合能力 ═══ -->
      <section class="section">
        <div class="container-page">
          <div class="combo">
            <div class="combo-copy" v-reveal>
              <p class="section-label">{{ t("组合使用") }}</p>
              <h2 class="section-title">{{ t("共享统一技术底座") }}</h2>
              <p class="section-desc">
                {{
                  t(
                    "账号经统一登录中心认证，业务数据存放于云数据库，文件存储于对象存储，代码在 IDE 中编写并部署至云服务。各产品均可独立接入；组合使用时，各环节之间无需另行对接。",
                  )
                }}
              </p>
              <RouterLink to="/#contact" class="btn btn-primary combo-btn">
                {{ t("聊聊你的场景") }}
              </RouterLink>
            </div>

            <!-- 右侧：三大技术体系入口（用户 2026-09-20：「右边的图片删除，然后放三个服务的链接」）。
                 原先这里是一张 services/overview 总览示意图 —— 图里画的正是这三层，
                 换成三个可点的窗口后，信息不减、还多了去往体系详情页的入口。
                 名称/全称/定位/指标全部取自技术体系数据（单源），不另抄文案。 -->
            <div class="combo-systems" v-reveal="120">
              <RouterLink
                v-for="(ts, i) in systems"
                :key="ts.slug"
                :to="`/tech/${ts.slug}`"
                class="card card-hover cs-item"
                :aria-label="t('查看 {name} 技术细节', { name: ts.name })"
              >
                <div class="cs-head">
                  <span class="cs-index tnum">{{ String(i + 1).padStart(2, "0") }}</span>
                  <span class="cs-go" aria-hidden="true">→</span>
                </div>
                <h3 class="cs-name">
                  {{ ts.name }}
                  <span class="cs-full">{{ ts.full_name }}</span>
                </h3>
                <p class="cs-sub">{{ t(ts.description) }}</p>
                <div class="cs-metrics">
                  <div v-for="m in ts.metrics.slice(0, 2)" :key="m.label" class="cs-metric">
                    <span class="cs-value tnum">{{ m.value }}<i v-if="m.unit">{{ m.unit }}</i></span>
                    <span class="cs-label">{{ t(m.label) }}</span>
                  </div>
                </div>
              </RouterLink>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* ═══ 页头：占满一屏（服务页 / 开发者页同一套版式） ═══
   用户：「一点进去那个页面要把整个页面占满，下面正文的标题都看到了很不协调。」
   于是页头做成整屏：面包屑贴顶、标题簇居中、数字条贴底，
   首屏不再露出下一区块的「核心产品 / 从开发到上线的产品矩阵」。
   用 min-height 不用 height —— 内容比视口高时（窄屏、放大字号）照样撑得开，不会被压扁；
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

/* 标题放大：页头占满一屏后，60px 在这个尺度下显得单薄（用户：「宽了之后有点空，标题可以大一些」）。
   上限提到 72px —— 与 /tech/:slug 的页头标题同档，全站最大标题不超过这一档。 */
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

/* 大标题左侧一条品牌蓝强调竖条：页头纯白 + 蓝光晕下，标题本身还缺一点「压得住」的色。
   竖条贴标题左缘、上下留 0.12em 呼吸，像图纸上的强调线，不是整块色块。 */
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

/* 导语行宽放到 w-prose（860px）：页头整屏后 780px 右边空出一截。
   颜色用主文字黑（--color-ink）而非次要灰 —— 用户：「小字颜色深一些」。
   整屏页头下这一行是唯一的信息载体，发灰会让页头显得空。 */
.page-desc {
  max-width: var(--layout-w-prose);
  margin-top: var(--space-5);
  font-size: var(--font-size-lg);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink);
  /* 标题簇已由 .page-label 的 vh 上边距定在页头上部，这里不再补底部余量。 */
}

/* ═══ 产品网格 ═══ */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-5);
}

.product {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.product-visual {
  position: relative;
  border-bottom: 1px solid var(--color-line);
}

.pin {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  z-index: 1;
  padding: 3px var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-ink-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-sm);
}

.product-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  flex: 1;
}

.product-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.product-heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  min-width: 0;
}

.product-index {
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
  flex: none;
}

.product-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-ink);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  font-size: var(--font-size-xs);
  color: var(--color-status-success);
}

.status.is-beta {
  color: var(--color-status-warning);
}

.status.is-planned {
  color: var(--color-ink-tertiary);
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.product-desc {
  font-size: var(--font-size-sm);
  line-height: var(--font-line-height-normal);
  color: var(--color-ink-secondary);
  flex: 1;
}

.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.product-link {
  margin-top: var(--space-1);
}

/* ═══ 生态工具 ═══ */
.eco {
  border-top: 1px solid var(--color-line);
}

.eco-row {
  display: grid;
  grid-template-columns: 32px 220px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-3);
  border-bottom: 1px solid var(--color-line);
  transition: background-color var(--motion-duration-fast) var(--motion-ease-out);
}

.eco-row:hover {
  background: var(--color-bg);
}

.eco-index {
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

.eco-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-ink);
}

.eco-row:hover .eco-name {
  color: var(--color-accent);
}

.eco-desc {
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
}

.eco-tags {
  display: flex;
  gap: var(--space-2);
}

.eco-arrow {
  font-size: var(--font-size-base);
  color: var(--color-ink-tertiary);
}

.eco-row:hover .eco-arrow {
  color: var(--color-accent);
}

/* ═══ 组合能力 ═══ */
.combo {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  align-items: center;
  gap: var(--space-9);
}

.combo-btn {
  margin-top: var(--space-7);
}

/* 右侧：三个体系入口窗口，竖排一列。
   高度与左侧文案列（标签+标题+导语+按钮）自然对齐，不再需要固定比例撑高。 */
.combo-systems {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.cs-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
  color: inherit;
}

.cs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.cs-index {
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

/* 箭头：静置时压暗，悬浮时变蓝并右移一小步 —— 与生态工具行同一套反馈语言 */
.cs-go {
  font-size: var(--font-size-base);
  color: var(--color-ink-tertiary);
  transition: color var(--motion-duration-fast) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out);
}

.cs-item:hover .cs-go {
  color: var(--color-accent);
  transform: translateX(3px);
}

.cs-name {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-ink);
}

.cs-item:hover .cs-name {
  color: var(--color-accent);
}

.cs-full {
  font-size: var(--font-size-xs);
  font-weight: 400;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

.cs-sub {
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
}

/* 指标贴卡片底：两张卡高度不一时，指标行仍对齐同一水平线 */
.cs-metrics {
  display: flex;
  gap: var(--space-7);
  margin-top: var(--space-1);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-line);
}

.cs-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cs-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}

.cs-value i {
  font-size: var(--font-size-sm);
  font-style: normal;
  color: var(--color-ink-tertiary);
}

.cs-label {
  font-size: var(--font-size-xs);
  color: var(--color-ink-tertiary);
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

/* ═══ 响应式 ═══ */
@media (max-width: 1024px) {
  .combo {
    grid-template-columns: 1fr;
    gap: var(--space-7);
  }
}

@media (max-width: 768px) {
  .page-hero {
    padding-top: 104px;
  }
  .page-desc {
    font-size: var(--font-size-base);
  }
  .eco-row {
    grid-template-columns: 1fr auto;
    gap: var(--space-2) var(--space-4);
  }
  .eco-desc,
  .eco-tags {
    grid-column: 1 / -1;
  }
  .eco-arrow {
    grid-row: 1;
    grid-column: 2;
  }
  .combo-btn {
    width: 100%;
  }
}
</style>

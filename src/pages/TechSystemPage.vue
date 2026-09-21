<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api/client";
import type { ProductDetail, TechSystemDetail } from "../api/types";
import TechDiagram from "../components/TechDiagram.vue";
import BlueprintGrid from "../components/deco/BlueprintGrid.vue";
import CornerFrame from "../components/deco/CornerFrame.vue";
import CrossMark from "../components/deco/CrossMark.vue";
import { t } from "../i18n";

const route = useRoute();
const system = ref<TechSystemDetail | null>(null);
const products = ref<ProductDetail[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

/* 体系顺序，用于页尾互相跳转 */
const order = ["hec", "uef", "cep"];
const siblingName: Record<string, string> = {
  hec: "HEC",
  uef: "UEF",
  cep: "CEP",
};

const relatedProducts = computed(() =>
  products.value.filter((p) => p.tech_system === system.value?.slug),
);

const sibling = computed(() => {
  const slug = system.value?.slug ?? "";
  const i = order.indexOf(slug);
  if (i < 0) return [];
  return [
    order[(i - 1 + order.length) % order.length],
    order[(i + 1) % order.length],
  ];
});

async function load(slug: string) {
  loading.value = true;
  error.value = null;
  try {
    const [sys, prodRes] = await Promise.all([
      api.getTechSystem(slug),
      api.listProducts(),
    ]);
    system.value = sys;
    products.value = prodRes.items ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : t("加载失败");
    system.value = null;
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.slug,
  (slug) => {
    if (typeof slug === "string") load(slug);
  },
  { immediate: true },
);
</script>

<template>
  <div class="page">
    <div v-if="loading" class="container-page state">{{ t("加载中…") }}</div>
    <div v-else-if="error" class="container-page state state-error">{{ error }}</div>

    <template v-else-if="system">
      <!-- ═══ 页面头 ═══ -->
      <section class="page-hero">
        <BlueprintGrid variant="grid" :size="72" :fade="true" />
        <div class="container-page inner">
          <nav class="crumb" :aria-label="t('面包屑')">
            <RouterLink to="/">{{ t("首页") }}</RouterLink>
            <span class="crumb-sep">/</span>
            <span>{{ t("技术体系") }}</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-current">{{ system.name }}</span>
          </nav>

          <p class="page-label">{{ t("技术体系") }}</p>
          <h1 class="page-title">{{ system.name }}</h1>
          <p class="page-fullname">{{ system.full_name }}</p>
          <p class="page-desc">{{ t(system.long_description) }}</p>

          <div v-if="system.metrics.length" class="page-metrics">
            <div v-for="m in system.metrics" :key="m.label" class="pm">
              <span class="pm-value tnum">{{ m.value }}<i v-if="m.unit">{{ m.unit }}</i></span>
              <span class="pm-label">{{ t(m.label) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ 架构示意 ═══
           容器放宽到 w-wide（1400），并另起一个更小的上边距类 ——
           用户反馈「图片再往两边靠一些」「优化一下布局，图片上面的」：
           图纸被 1200 的正文容器夹在 160px 的页边距里，图内字号本来就只有十几像素，
           再被夹一圈就彻底看不清了。图纸这种横向铺开的东西允许比正文宽一档。 -->
      <section class="section-tight diagram-section">
        <div class="container-page diagram-band">
          <div class="diagram-wrap" v-reveal>
            <BlueprintGrid variant="dot" :size="20" :fade="false" />
            <CornerFrame tone="line" :len="20" />
            <TechDiagram :kind="(system.slug as 'hec' | 'uef' | 'cep')" />
          </div>
          <p class="diagram-caption">{{ t("示意图，用于说明 {name} 的结构关系", { name: system.name }) }}</p>
        </div>
      </section>

      <!-- ═══ 能力构成 ═══ -->
      <section class="section section-subtle">
        <div class="container-page">
          <header class="section-head" v-reveal>
            <p class="section-label">{{ t("能力构成") }}</p>
            <h2 class="section-title">{{ t("核心能力") }}</h2>
          </header>

          <div class="abilities">
            <article v-for="(f, i) in system.features" :key="f.title" v-reveal="60 * i" class="ability">
              <div class="ability-head">
                <span class="ability-index tnum">{{ String(i + 1).padStart(2, "0") }}</span>
                <CrossMark :size="10" />
              </div>
              <h3 class="ability-title">{{ t(f.title) }}</h3>
              <p class="ability-desc">{{ t(f.description) }}</p>
            </article>
          </div>
        </div>
      </section>

      <!-- ═══ 关联产品 ═══ -->
      <section v-if="relatedProducts.length" class="section">
        <div class="container-page">
          <header class="section-head" v-reveal>
            <p class="section-label">{{ t("关联产品") }}</p>
            <h2 class="section-title">{{ t("基于 {name} 的产品", { name: system.name }) }}</h2>
          </header>

          <div class="rel-list">
            <!-- 关联产品：直接跳产品自己的站点 -->
            <a
              v-for="p in relatedProducts"
              :key="p.slug"
              :href="p.url ?? undefined"
              target="_blank"
              rel="noopener"
              class="rel-row"
              v-reveal
            >
              <div>
                <h3 class="rel-name">{{ t(p.name) }}</h3>
                <p class="rel-desc">{{ t(p.description) }}</p>
              </div>
              <div class="rel-tags">
                <span v-for="tag in p.tags.slice(0, 2)" :key="tag" class="tag">{{ t(tag) }}</span>
              </div>
              <span class="rel-arrow">↗</span>
            </a>
          </div>
        </div>
      </section>

      <!-- ═══ 其他体系 ═══ -->
      <section class="section-tight section-ink">
        <div class="container-page">
          <p class="next-label">{{ t("继续浏览") }}</p>
          <div class="next-grid">
            <RouterLink v-for="s in sibling" :key="s" :to="`/tech/${s}`" class="next-item">
              <span class="next-code">{{ siblingName[s] }}</span>
              <span class="next-arrow">→</span>
            </RouterLink>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.state {
  padding: var(--space-10) 0;
  font-size: var(--font-size-base);
  color: var(--color-ink-secondary);
}

.state-error {
  color: var(--color-status-danger);
}

/* ═══ 页面头 ═══ */
.page-hero {
  position: relative;
  padding: 132px 0 var(--space-6);
  border-bottom: 1px solid var(--color-line);
  overflow: hidden;
}

.inner {
  position: relative;
  z-index: 1;
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

.page-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-accent);
  margin-bottom: var(--space-3);
}

.page-title {
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 700;
  line-height: var(--font-line-height-tight);
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.page-fullname {
  margin-top: var(--space-3);
  font-size: var(--font-size-lg);
  color: var(--color-ink-tertiary);
}

.page-desc {
  max-width: 720px;
  margin-top: var(--space-5);
  font-size: var(--font-size-lg);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

.page-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  margin-top: var(--space-7);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-line);
}

.pm-value {
  display: block;
  font-size: var(--font-size-3xl);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.pm-value i {
  font-style: normal;
  font-size: var(--font-size-base);
  color: var(--color-ink-secondary);
  margin-left: 2px;
}

.pm-label {
  display: block;
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
}

/* ═══ 架构图 ═══
   图画带比正文宽一档（w-wide 1400 而不是 w-content 1200）：
   图纸里的字是按「画布 1600」定的，实际拿到多少像素宽就决定读者看到多少号的字。
   1200 容器 + 32px 内边距下只有 1054px，图内 28px 的字落到屏幕上只剩 18px 出头；
   放宽到 w-wide 并收窄内边距后能拿到 1270px 左右，同一张图整体大两成。 */
.diagram-band {
  max-width: var(--layout-w-wide);
}

/* 图纸与上方页头之间的空档收窄一档（原来 64 + 64 = 128px，图纸被推得太低，
   首屏滚动后先看到一大片白）。 */
.diagram-section {
  padding-top: var(--space-6);
}

.diagram-wrap {
  position: relative;
  padding: var(--space-5);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.diagram-caption {
  margin-top: var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--color-ink-tertiary);
}

/* ═══ 能力 ═══ */
.abilities {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
}

.ability {
  padding: var(--space-6);
  background: var(--color-bg);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}

.ability-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.ability-index {
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-accent);
}

.ability-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: var(--space-3);
}

.ability-desc {
  font-size: var(--font-size-sm);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

/* ═══ 关联产品 ═══ */
.rel-list {
  border-top: 1px solid var(--color-line);
}

.rel-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 24px;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-3);
  border-bottom: 1px solid var(--color-line);
  transition: background-color var(--motion-duration-fast) var(--motion-ease-out);
}

.rel-row:hover {
  background: var(--color-bg-subtle);
}

.rel-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-ink);
}

.rel-row:hover .rel-name {
  color: var(--color-accent);
}

.rel-desc {
  margin-top: 2px;
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
}

.rel-tags {
  display: flex;
  gap: var(--space-2);
}

.rel-arrow {
  color: var(--color-ink-tertiary);
}

.rel-row:hover .rel-arrow {
  color: var(--color-accent);
}

/* ═══ 其他体系 ═══ */
.next-label {
  margin-bottom: var(--space-5);
  font-size: var(--font-size-sm);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-inverse-dim);
}

.next-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

.next-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  border: 1px solid var(--color-line-inverse);
  border-radius: var(--radius-lg);
  transition: border-color var(--motion-duration-fast) var(--motion-ease-out);
}

.next-item:hover {
  border-color: var(--color-ink-inverse);
}

.next-code {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-ink-inverse);
}

.next-arrow {
  color: var(--color-ink-inverse-dim);
}

@media (max-width: 768px) {
  .page-hero {
    padding-top: 104px;
  }
  .page-desc {
    font-size: var(--font-size-base);
  }
  .page-metrics {
    gap: var(--space-6);
  }
  .rel-row {
    grid-template-columns: 1fr auto;
  }
  .rel-tags {
    display: none;
  }
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api/client";
import type { Product, ProductDetail } from "../api/types";
import ImageSlot from "../components/ImageSlot.vue";
import BlueprintGrid from "../components/deco/BlueprintGrid.vue";
import CrossMark from "../components/deco/CrossMark.vue";
import { t } from "../i18n";

const route = useRoute();
const product = ref<ProductDetail | null>(null);
const allProducts = ref<Product[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const statusText: Record<string, string> = {
  live: "运行中",
  beta: "内测中",
  planned: "规划中",
};

const systemName: Record<string, string> = {
  hec: "HEC",
  uef: "UEF",
  cep: "CEP",
};

const others = computed(() =>
  allProducts.value
    .filter((p) => p.slug !== product.value?.slug && p.featured)
    .slice(0, 3),
);

async function load(slug: string) {
  loading.value = true;
  error.value = null;
  try {
    const [prod, listRes] = await Promise.all([
      api.getProduct(slug),
      api.listProducts(),
    ]);
    product.value = prod;
    allProducts.value = listRes.items ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : t("加载失败");
    product.value = null;
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

    <template v-else-if="product">
      <!-- ═══ 页面头 ═══ -->
      <section class="page-hero">
        <BlueprintGrid variant="grid" :size="72" :fade="true" />
        <div class="container-page inner">
          <nav class="crumb" :aria-label="t('面包屑')">
            <RouterLink to="/">{{ t("首页") }}</RouterLink>
            <span class="crumb-sep">/</span>
            <span>{{ t("产品") }}</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-current">{{ t(product.name) }}</span>
          </nav>

          <div class="hero-grid">
            <div class="hero-main">
              <div class="hero-meta">
                <span v-if="product.status" class="status">
                  <i class="status-dot"></i>{{ t(statusText[product.status] ?? product.status) }}
                </span>
                <span v-if="product.tech_system" class="meta-sep"></span>
                <RouterLink
                  v-if="product.tech_system"
                  :to="`/tech/${product.tech_system}`"
                  class="meta-link"
                >
                  {{ t("基于 {name} 体系", { name: systemName[product.tech_system] ?? product.tech_system }) }}
                </RouterLink>
              </div>

              <h1 class="page-title">{{ t(product.name) }}</h1>
              <p class="page-desc">{{ t(product.long_description) }}</p>

              <div class="hero-actions">
                <a
                  v-if="product.url"
                  :href="product.url"
                  target="_blank"
                  rel="noopener"
                  class="btn btn-primary"
                >
                  {{ t("访问产品") }}
                  <span class="arrow">↗</span>
                </a>
                <RouterLink to="/#contact" class="btn btn-secondary">{{ t("咨询接入") }}</RouterLink>
              </div>
            </div>

            <aside v-if="product.metrics.length" class="hero-side">
              <p class="side-title">{{ t("关键指标") }}</p>
              <div v-for="m in product.metrics" :key="m.label" class="side-metric">
                <span class="sm-value tnum">{{ m.value }}<i v-if="m.unit">{{ m.unit }}</i></span>
                <span class="sm-label">{{ t(m.label) }}</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <!-- ═══ 产品截图位 ═══ -->
      <section class="section-tight">
        <div class="container-page">
          <!-- 产品截图位：products/{slug} · 1440 × 900 px（16:10）
               图没到位时占位框会直接写出文件名、尺寸与画面要求 -->
          <ImageSlot
            v-reveal
            class="shot"
            :slot="`products/${product.slug}`"
            :alt="t('{name} 界面截图', { name: product.name })"
          />
        </div>
      </section>

      <!-- ═══ 功能特性 ═══ -->
      <section v-if="product.features.length" class="section section-subtle">
        <div class="container-page">
          <header class="section-head" v-reveal>
            <p class="section-label">{{ t("功能") }}</p>
            <h2 class="section-title">{{ t("核心能力") }}</h2>
          </header>

          <div class="features">
            <article v-for="(f, i) in product.features" :key="f.title" v-reveal="60 * i" class="feature">
              <div class="feature-head">
                <span class="feature-index tnum">{{ String(i + 1).padStart(2, "0") }}</span>
                <CrossMark :size="10" />
              </div>
              <h3 class="feature-title">{{ t(f.title) }}</h3>
              <p class="feature-desc">{{ t(f.description) }}</p>
            </article>
          </div>

          <div v-if="product.tags.length" class="tags-row">
            <span v-for="tag in product.tags" :key="tag" class="tag tag-accent">{{ t(tag) }}</span>
          </div>
        </div>
      </section>

      <!-- ═══ 其他产品 ═══ -->
      <section v-if="others.length" class="section">
        <div class="container-page">
          <header class="section-head" v-reveal>
            <p class="section-label">{{ t("继续了解") }}</p>
            <h2 class="section-title">{{ t("其他产品") }}</h2>
          </header>

          <div class="others">
            <a
              v-for="p in others"
              :key="p.slug"
              :href="p.url ?? undefined"
              target="_blank"
              rel="noopener"
              class="other"
              v-reveal
            >
              <h3 class="other-name">{{ t(p.name) }}</h3>
              <p class="other-desc">{{ t(p.description) }}</p>
              <span class="other-arrow">↗</span>
            </a>
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
  padding: 132px 0 var(--space-8);
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

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: var(--space-9);
  align-items: start;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-status-success);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-status-success);
}

.meta-sep {
  width: 1px;
  height: 12px;
  background: var(--color-line-strong);
}

.meta-link {
  font-size: var(--font-size-sm);
  color: var(--color-accent);
}

.page-title {
  font-size: clamp(34px, 4.6vw, 56px);
  font-weight: 600;
  line-height: var(--font-line-height-tight);
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.page-desc {
  max-width: 640px;
  margin-top: var(--space-5);
  font-size: var(--font-size-lg);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-7);
  flex-wrap: wrap;
}

/* 指标侧栏 */
.hero-side {
  padding: var(--space-6);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}

.side-title {
  margin-bottom: var(--space-5);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-ink);
}

.side-metric + .side-metric {
  margin-top: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-line);
}

.sm-value {
  display: block;
  font-size: var(--font-size-2xl);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.sm-value i {
  font-style: normal;
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
  margin-left: 2px;
}

.sm-label {
  display: block;
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
}

/* ═══ 截图位 ═══ */
/* 宽高比由 ImageSlot 按规格表撑开，这里只负责描边与圆角裁剪 */
.shot {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

/* ═══ 功能 ═══ */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
}

.feature {
  padding: var(--space-6);
  background: var(--color-bg);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}

.feature-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.feature-index {
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-accent);
}

.feature-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: var(--space-3);
}

.feature-desc {
  font-size: var(--font-size-sm);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-7);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-line);
}

/* ═══ 其他产品 ═══ */
.others {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
}

.other {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  transition:
    border-color var(--motion-duration-fast) var(--motion-ease-out),
    box-shadow var(--motion-duration-normal) var(--motion-ease-out);
}

.other:hover {
  border-color: var(--color-line-strong);
  box-shadow: var(--shadow-md);
}

.other-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-ink);
}

.other:hover .other-name {
  color: var(--color-accent);
}

.other-desc {
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
  flex: 1;
}

.other-arrow {
  color: var(--color-ink-tertiary);
}

@media (max-width: 1024px) {
  .hero-grid {
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
}
</style>

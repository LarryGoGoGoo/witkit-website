<script setup lang="ts">
/**
 * 新闻详情
 *
 * 三态齐全：加载中 / 找不到（404 语义，不是空白页）/ 正常。
 * 底部的「上一篇 / 下一篇」由列表顺序推出来，不额外请求接口。
 */
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api/client";
import type { NewsItem } from "../api/types";
import ImageSlot from "../components/ImageSlot.vue";
import BlueprintGrid from "../components/deco/BlueprintGrid.vue";
import { t } from "../i18n";

const route = useRoute();

const loading = ref(true);
const notFound = ref(false);
const error = ref<string | null>(null);
const item = ref<NewsItem | null>(null);
const siblings = ref<NewsItem[]>([]);

const index = computed(() =>
  siblings.value.findIndex((n) => n.slug === item.value?.slug),
);
const prev = computed(() =>
  index.value > 0 ? siblings.value[index.value - 1] : null,
);
const next = computed(() =>
  index.value >= 0 && index.value < siblings.value.length - 1
    ? siblings.value[index.value + 1]
    : null,
);

function fmtDate(iso: string) {
  return iso.replace(/-/g, ".");
}

async function load(slug: string) {
  loading.value = true;
  notFound.value = false;
  error.value = null;
  item.value = null;
  try {
    const [detailRes, listRes] = await Promise.all([
      api.getNews(slug),
      api.listNews(),
    ]);
    item.value = detailRes;
    siblings.value = listRes.items ?? [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "加载失败";
    /* 后端把「不存在」表达为 404 + error.message，这里按语义区分空态与错误态 */
    if (msg.includes("不存在")) notFound.value = true;
    else error.value = msg;
  } finally {
    loading.value = false;
  }
}

onMounted(() => load(String(route.params.slug)));
watch(
  () => route.params.slug,
  (slug) => {
    if (slug) load(String(slug));
  },
);

/* 标题要等数据到位才能定。路由 afterEach 已经先把标题复位成默认值，
   这里拿到内容后再覆盖，不会出现上一页标题残留。 */
watch(item, (v) => {
  if (v) document.title = `${v.title} · witkit 妙计科技`;
});
</script>

<template>
  <div class="page">
    <section class="page-hero">
      <BlueprintGrid variant="cross" :size="88" :fade="true" />
      <div class="container-page inner">
        <nav class="crumb" :aria-label="t('面包屑')">
          <RouterLink to="/">{{ t("首页") }}</RouterLink>
          <span class="crumb-sep">/</span>
          <RouterLink to="/news">{{ t("新闻动态") }}</RouterLink>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ t("正文") }}</span>
        </nav>

        <template v-if="item">
          <div class="meta">
            <span class="cat">{{ t(item.category) }}</span>
            <span class="date tnum">{{ fmtDate(item.published_at) }}</span>
          </div>
          <h1 class="page-title">{{ t(item.title) }}</h1>
          <p class="page-desc">{{ t(item.summary) }}</p>
        </template>
        <h1 v-else class="page-title">{{ t("新闻动态") }}</h1>
      </div>
    </section>

    <section class="section">
      <div class="container-page">
        <!-- 加载中 -->
        <p v-if="loading" class="state">{{ t("正在加载正文…") }}</p>

        <!-- 404：给回退路径，不留空白 -->
        <div v-else-if="notFound" class="state-block">
          <p class="sb-title">{{ t("这篇动态不存在或已下线") }}</p>
          <p class="sb-desc">{{ t("链接可能已经过期，回到列表看看最新的内容。") }}</p>
          <RouterLink to="/news" class="btn btn-secondary">{{ t("返回新闻列表") }}</RouterLink>
        </div>

        <!-- 失败 -->
        <div v-else-if="error" class="state-block">
          <p class="sb-title sb-error">{{ error }}</p>
          <p class="sb-desc">{{ t("稍后再试，或者先看看其他动态。") }}</p>
          <RouterLink to="/news" class="btn btn-secondary">{{ t("返回新闻列表") }}</RouterLink>
        </div>

        <!-- 正文 -->
        <template v-else-if="item">
          <!-- 封面位：news/{slug} · 1200 × 675 px（16:9） -->
          <div class="cover" v-reveal>
            <ImageSlot :slot="`news/${item.slug}`" :alt="t('{name} 配图', { name: item.title })" />
          </div>

          <article class="body">
            <p v-for="(para, i) in item.body" :key="i" class="para">{{ t(para) }}</p>
          </article>

          <nav class="pager" :aria-label="t('上一篇 / 下一篇')">
            <RouterLink v-if="prev" :to="`/news/${prev.slug}`" class="pager-item">
              <span class="pager-dir">{{ t("← 上一篇") }}</span>
              <span class="pager-title">{{ t(prev.title) }}</span>
            </RouterLink>
            <span v-else class="pager-item is-disabled">
              <span class="pager-dir">{{ t("← 上一篇") }}</span>
              <span class="pager-title">{{ t("已经是第一篇") }}</span>
            </span>

            <RouterLink v-if="next" :to="`/news/${next.slug}`" class="pager-item is-next">
              <span class="pager-dir">{{ t("下一篇 →") }}</span>
              <span class="pager-title">{{ t(next.title) }}</span>
            </RouterLink>
            <span v-else class="pager-item is-next is-disabled">
              <span class="pager-dir">{{ t("下一篇 →") }}</span>
              <span class="pager-title">{{ t("已经是最新一篇") }}</span>
            </span>
          </nav>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
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

.meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-sm);
}

.cat {
  font-weight: 600;
  color: var(--color-accent);
}

.date {
  color: var(--color-ink-tertiary);
}

.page-title {
  max-width: 900px;
  font-size: clamp(30px, 3.8vw, 48px);
  font-weight: 600;
  line-height: var(--font-line-height-tight);
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.page-desc {
  max-width: 780px;
  margin-top: var(--space-5);
  font-size: var(--font-size-lg);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

/* ═══ 封面 ═══ */
.cover {
  margin-bottom: var(--space-8);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

/* ═══ 正文：正文区故意收窄，中文长段落读起来才不累 ═══ */
.body {
  max-width: var(--layout-w-read);
}

.para {
  font-size: var(--font-size-lg);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

.para + .para {
  margin-top: var(--space-5);
}

/* ═══ 上下篇 ═══ */
.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  max-width: var(--layout-w-content);
  margin-top: var(--space-9);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-line);
}

.pager-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  transition: border-color var(--motion-duration-fast) var(--motion-ease-out);
}

.pager-item:hover {
  border-color: var(--color-accent);
}

.pager-item.is-next {
  text-align: right;
}

.pager-item.is-disabled {
  color: var(--color-ink-tertiary);
  border-style: dashed;
}

.pager-dir {
  font-size: var(--font-size-xs);
  color: var(--color-ink-tertiary);
}

.pager-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: var(--font-line-height-snug);
  color: var(--color-ink);
}

.pager-item.is-disabled .pager-title {
  font-weight: 400;
  color: var(--color-ink-tertiary);
}

.pager-item:hover .pager-title {
  color: var(--color-accent);
}

/* ═══ 状态 ═══ */
.state {
  padding: var(--space-8) 0;
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-ink-tertiary);
}

.state-block {
  max-width: 520px;
  padding: var(--space-8) 0;
}

.sb-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-ink);
}

.sb-error {
  color: var(--color-status-danger);
}

.sb-desc {
  margin-top: var(--space-3);
  font-size: var(--font-size-base);
  color: var(--color-ink-secondary);
}

.state-block .btn {
  margin-top: var(--space-6);
}

/* ═══ 响应式 ═══ */
@media (max-width: 768px) {
  .page-hero {
    padding-top: 104px;
  }
  .page-desc,
  .para {
    font-size: var(--font-size-base);
  }
  .pager {
    grid-template-columns: 1fr;
  }
  .pager-item.is-next {
    text-align: left;
  }
}
</style>

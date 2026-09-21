<script setup lang="ts">
/**
 * 新闻动态
 *
 * 页面就两个板块：
 *   1. 重点推荐 —— 人工标了「置顶」的那几条，自动轮播。一条都没标就整块不显示。
 *   2. 最新资讯 —— 其余新闻，按日期倒序，可切分类。
 *
 * 分类筛选只作用于下面的列表，不动上面的轮播：
 *   「重点」本来就是跨分类挑出来的，跟着分类变会让整个页面跳来跳去。
 *
 * 顺序由内容层排好（置顶优先 + 时间倒序），前端不再排序，
 * 以后换成真后端时这里一行都不用改。
 *
 * 分类筛选走「一次拉全 + 前端筛」而不是「每次点击都请求」：
 * 官网新闻量级在几十条以内，一次拿完切分类是瞬时的，体验比 loading 转圈好。
 * 数据量涨上去再换成带 category 参数的请求（接口已经支持）。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { api } from "../api/client";
import type { NewsItem } from "../api/types";
import ImageSlot from "../components/ImageSlot.vue";
import BlueprintGrid from "../components/deco/BlueprintGrid.vue";
import { t } from "../i18n";

const loading = ref(true);
const error = ref<string | null>(null);
const items = ref<NewsItem[]>([]);
const activeCategory = ref("全部");

const categories = ["全部", "公司动态", "产品发布", "技术分享", "生态合作"];

const byCategory = computed(() =>
  activeCategory.value === "全部"
    ? items.value
    : items.value.filter((n) => n.category === activeCategory.value),
);

/* ═══ 板块一：重点推荐 ═══
   只收人工标了置顶的，最多 5 条 —— 滚动区超过 5 条就没人看完了 */
const featured = computed(() =>
  items.value.filter((n) => n.pinned).slice(0, 5),
);

/* ═══ 板块二：最新资讯 ═══
   被提到上面去的那些不再重复出现，同一个页面里同一篇出现两次像是坏了 */
const latest = computed(() => byCategory.value.filter((n) => !n.pinned));

/* 一条内容都没有 —— 现在是常态，所以这个空态要做得像设计过的，不能像报错 */
const empty = computed(
  () => !loading.value && !error.value && !items.value.length,
);

function fmtDate(iso: string) {
  return iso.replace(/-/g, ".");
}

/* ═══ 轮播 ═══
   自动播放有三条刹车：用户手动暂停、鼠标/键盘焦点停在轮播里、系统开了「减少动态」。
   WCAG 2.2.2 要求自动播放的内容可暂停，所以暂停按钮不是可选项。 */
const active = ref(0);
const paused = ref(false);
const holding = ref(false);
const reducedMotion = ref(false);

const autoPlay = computed(
  () =>
    !paused.value &&
    !holding.value &&
    !reducedMotion.value &&
    featured.value.length > 1,
);

let timer: number | undefined;

function stopTimer() {
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

function startTimer() {
  stopTimer();
  timer = window.setInterval(() => {
    active.value = (active.value + 1) % featured.value.length;
  }, 6000);
}

function go(i: number) {
  active.value = i;
  /* 手动切换后重新计时，否则刚点完可能立刻又跳走 */
  if (autoPlay.value) startTimer();
}

function step(delta: number) {
  const n = featured.value.length;
  go((active.value + delta + n) % n);
}

watch(autoPlay, (on) => (on ? startTimer() : stopTimer()));

watch(
  () => featured.value.length,
  (n) => {
    if (active.value >= n) active.value = 0;
  },
);

let motionQuery: MediaQueryList | null = null;
function onMotionChange() {
  reducedMotion.value = motionQuery?.matches ?? false;
}

onMounted(async () => {
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.value = motionQuery.matches;
  motionQuery.addEventListener("change", onMotionChange);

  try {
    const res = await api.listNews();
    items.value = res.items ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载失败";
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  stopTimer();
  motionQuery?.removeEventListener("change", onMotionChange);
});
</script>

<template>
  <div class="page">
    <!-- ═══ 页头 ═══ -->
    <section class="page-hero">
      <BlueprintGrid variant="cross" :size="88" :fade="true" />
      <div class="container-page inner">
        <nav class="crumb" :aria-label="t('面包屑')">
          <RouterLink to="/">{{ t("首页") }}</RouterLink>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ t("新闻动态") }}</span>
        </nav>

        <p class="page-label">{{ t("新闻动态") }}</p>
        <h1 class="page-title">{{ t("产品发布与团队近况") }}</h1>
      </div>
    </section>

    <!-- ═══ 加载 / 失败 ═══ -->
    <section v-if="loading || error" class="section">
      <div class="container-page">
        <p v-if="loading" class="state">{{ t("正在加载动态…") }}</p>
        <p v-else class="state state-error">{{ error }}</p>
      </div>
    </section>

    <!-- ═══ 空态 ═══ -->
    <section v-else-if="empty" class="section">
      <div class="container-page">
        <div class="blank" v-reveal>
          <div class="blank-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <rect x="12" y="9" width="40" height="46" rx="4" />
              <path d="M21 21h22M21 30h22M21 39h14" />
            </svg>
          </div>
          <p class="blank-title">{{ t("内容筹备中") }}</p>
          <p class="blank-desc">
            {{
              t(
                "这里将发布产品上线、技术进展与团队动态。目前还没有对外发布的内容，第一批准备好后会在这一页出现。",
              )
            }}
          </p>
          <div class="blank-actions">
            <RouterLink to="/products" class="btn btn-secondary">
              {{ t("先看看产品") }}
            </RouterLink>
            <RouterLink to="/" class="btn btn-secondary">
              {{ t("回到首页") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <template v-else>
      <!-- ═══ 板块一 · 重点推荐（滚动） ═══ -->
      <section
        v-if="featured.length"
        class="section-tight"
        role="region"
        :aria-label="t('重点推荐')"
      >
        <div class="container-page">
          <header class="section-head">
            <p class="section-label">{{ t("重点") }}</p>
            <h2 class="section-title">{{ t("重点推荐") }}</h2>
          </header>

          <div
            class="carousel"
            @mouseenter="holding = true"
            @mouseleave="holding = false"
            @focusin="holding = true"
            @focusout="holding = false"
          >
            <div class="stage">
              <RouterLink
                v-for="(n, i) in featured"
                :key="n.slug"
                :to="`/news/${n.slug}`"
                class="slide card card-hover"
                :class="{ 'is-off': i !== active }"
                :tabindex="i === active ? 0 : -1"
                :aria-hidden="i !== active"
              >
                <!-- 封面位：news/{slug} · 1200 × 675 px（16:9） -->
                <div class="slide-media">
                  <ImageSlot :slot="`news/${n.slug}`" :alt="t('{name} 配图', { name: n.title })" />
                </div>

                <div class="slide-body">
                  <div class="meta">
                    <span class="cat">{{ t(n.category) }}</span>
                    <span class="date tnum">{{ fmtDate(n.published_at) }}</span>
                  </div>
                  <h3 class="slide-title">{{ t(n.title) }}</h3>
                  <p class="slide-summary">{{ t(n.summary) }}</p>
                  <span class="link-arrow">
                    {{ t("阅读全文") }} <span class="arrow">→</span>
                  </span>
                </div>
              </RouterLink>
            </div>

            <!-- 控制条：只有一条时整条不渲染（没什么可切的，按钮只会碍事） -->
            <div v-if="featured.length > 1" class="controls">
              <button
                class="ctl"
                type="button"
                :aria-label="t('上一条')"
                @click="step(-1)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5 8 12l7 7" />
                </svg>
              </button>

              <div class="dots">
                <button
                  v-for="(n, i) in featured"
                  :key="n.slug"
                  class="dot"
                  type="button"
                  :class="{ active: i === active }"
                  :aria-label="t('第 {n} 条', { n: i + 1 })"
                  :aria-current="i === active"
                  @click="go(i)"
                ></button>
              </div>

              <button
                class="ctl"
                type="button"
                :aria-label="paused ? t('继续自动播放') : t('暂停自动播放')"
                :disabled="reducedMotion"
                @click="paused = !paused"
              >
                <svg v-if="paused" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5.5v13l10-6.5z" />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9.5 5.5v13M14.5 5.5v13" />
                </svg>
              </button>

              <button
                class="ctl"
                type="button"
                :aria-label="t('下一条')"
                @click="step(1)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <p v-if="reducedMotion" class="carousel-note">
              {{ t("系统已开启「减少动态效果」，自动轮播已关闭。") }}
            </p>
          </div>
        </div>
      </section>

      <!-- ═══ 板块二 · 最新资讯 ═══ -->
      <section class="section">
        <div class="container-page">
          <header class="latest-head">
            <div>
              <p class="section-label">{{ t("全部动态") }}</p>
              <h2 class="section-title">{{ t("最新资讯") }}</h2>
            </div>

            <div class="filter" role="tablist" :aria-label="t('新闻分类')">
              <button
                v-for="c in categories"
                :key="c"
                class="chip"
                :class="{ active: activeCategory === c }"
                type="button"
                role="tab"
                :aria-selected="activeCategory === c"
                @click="activeCategory = c"
              >
                {{ t(c) }}
              </button>
            </div>
          </header>

          <!-- 分类下一条都没有：给回退路径，不要留个空白页 -->
          <div v-if="!latest.length" class="empty">
            <p class="empty-title">{{ t("这个分类下还没有内容") }}</p>
            <p class="empty-desc">{{ t("换个分类看看，或者回到全部。") }}</p>
            <button
              class="btn btn-secondary"
              type="button"
              @click="activeCategory = '全部'"
            >
              {{ t("看全部动态") }}
            </button>
          </div>

          <div v-else class="grid">
            <RouterLink
              v-for="(n, i) in latest"
              :key="n.slug"
              v-reveal="60 * i"
              :to="`/news/${n.slug}`"
              class="card card-hover item"
            >
              <!-- 封面位：news/{slug} · 1200 × 675 px（16:9） -->
              <div class="item-cover">
                <ImageSlot
                  size="sm"
                  :slot="`news/${n.slug}`"
                  :alt="t('{name} 配图', { name: n.title })"
                />
              </div>
              <div class="item-body">
                <div class="meta">
                  <span class="cat">{{ t(n.category) }}</span>
                  <span class="date tnum">{{ fmtDate(n.published_at) }}</span>
                </div>
                <h3 class="item-title">{{ t(n.title) }}</h3>
                <p class="item-summary">{{ t(n.summary) }}</p>
                <span class="link-arrow">
                  {{ t("阅读全文") }} <span class="arrow">→</span>
                </span>
              </div>
            </RouterLink>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page-hero {
  position: relative;
  padding: 132px 0 var(--space-8);
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
  font-size: clamp(34px, 4.6vw, 60px);
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

/* ═══ 元信息 ═══ */
.meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-xs);
}

.cat {
  font-weight: 600;
  color: var(--color-accent);
}

.date {
  color: var(--color-ink-tertiary);
}

/* ═══ 板块一 · 轮播 ═══
   所有 slide 叠在同一个网格单元里：切换时容器高度取最高的那张，
   正文长短不一也不会让页面上下跳。 */
.stage {
  display: grid;
}

.slide {
  grid-area: 1 / 1;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  overflow: hidden;
  transition: opacity var(--motion-duration-normal) var(--motion-ease-out);
}

.slide.is-off {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.slide-media {
  border-right: 1px solid var(--color-line);
}

.slide-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-8);
}

.slide-title {
  font-size: var(--font-size-3xl);
  font-weight: 600;
  line-height: var(--font-line-height-snug);
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.slide:hover .slide-title {
  color: var(--color-accent);
}

.slide-summary {
  flex: 1;
  font-size: var(--font-size-base);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

/* ═══ 轮播控制条 ═══ */
.controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.ctl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--a11y-tap-min);
  height: var(--a11y-tap-min);
  color: var(--color-ink-secondary);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-full);
  transition:
    color var(--motion-duration-fast) var(--motion-ease-out),
    border-color var(--motion-duration-fast) var(--motion-ease-out);
}

.ctl svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ctl:hover:not(:disabled) {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.ctl:disabled {
  color: var(--color-ink-tertiary);
  border-style: dashed;
  cursor: not-allowed;
}

.dots {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* 圆点本身是 44px 的按钮（触控目标达标），视觉上的小圆点由 ::before 画 */
.dot {
  position: relative;
  width: var(--a11y-tap-min);
  height: var(--a11y-tap-min);
}

.dot::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  background: var(--color-line-strong);
  border-radius: var(--radius-full);
  transition:
    background-color var(--motion-duration-fast) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out);
}

.dot:hover::before {
  background: var(--color-ink-tertiary);
}

.dot.active::before {
  background: var(--color-accent);
  transform: scale(1.35);
}

.carousel-note {
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-ink-tertiary);
}

/* ═══ 板块二 · 头部 ═══ */
.latest-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-8);
}

.filter {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  min-height: var(--a11y-tap-min);
  padding: 0 var(--space-4);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-ink-secondary);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-full);
  transition:
    color var(--motion-duration-fast) var(--motion-ease-out),
    border-color var(--motion-duration-fast) var(--motion-ease-out),
    background-color var(--motion-duration-fast) var(--motion-ease-out);
}

.chip:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.chip.active {
  color: var(--color-ink-inverse);
  background: var(--color-accent);
  border-color: var(--color-accent);
}

/* ═══ 列表 ═══ */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-5);
}

.item {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.item-cover {
  border-bottom: 1px solid var(--color-line);
}

.item-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  flex: 1;
}

.item-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  line-height: var(--font-line-height-snug);
  color: var(--color-ink);
}

.item:hover .item-title {
  color: var(--color-accent);
}

.item-summary {
  font-size: var(--font-size-sm);
  line-height: var(--font-line-height-normal);
  color: var(--color-ink-secondary);
  flex: 1;
}

/* ═══ 状态 / 空态 ═══ */
.state {
  padding: var(--space-8) 0;
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-ink-tertiary);
}

.state-error {
  color: var(--color-status-danger);
}

/* 「一条新闻都没有」不是错误状态，是一个要长期存在的正常状态，
   所以它长得像一张设计过的空版面，而不是一句灰色的加载失败。 */
.blank {
  max-width: 560px;
  padding: var(--space-10) var(--space-6);
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-xl);
}

.blank-mark svg {
  width: 56px;
  height: 56px;
  fill: none;
  stroke: var(--color-line-strong);
  stroke-width: 1.6;
  stroke-linecap: round;
}

.blank-title {
  margin-top: var(--space-5);
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-ink);
}

.blank-desc {
  margin-top: var(--space-3);
  font-size: var(--font-size-base);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

.blank-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.empty {
  padding: var(--space-10) 0;
  text-align: center;
}

.empty-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-ink);
}

.empty-desc {
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-ink-secondary);
}

.empty .btn {
  margin-top: var(--space-6);
}

/* ═══ 响应式 ═══ */
@media (max-width: 900px) {
  .slide {
    grid-template-columns: 1fr;
  }
  .slide-media {
    border-right: none;
    border-bottom: 1px solid var(--color-line);
  }
  .slide-body {
    padding: var(--space-6);
  }
  .slide-title {
    font-size: var(--font-size-2xl);
  }
}

@media (max-width: 768px) {
  .page-hero {
    padding-top: 104px;
  }
  .page-desc {
    font-size: var(--font-size-base);
  }
  .latest-head {
    align-items: flex-start;
  }
}
</style>

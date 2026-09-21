<script setup lang="ts">
/**
 * 全站顶栏
 *
 * 产品决策记录：
 * 1) 顶栏内容区比正文区宽（1560 vs 1200）—— 大厂站顶栏的 logo 与导航分别贴两侧。
 * 2) 下滑隐藏、上滑回来。往下翻说明用户在读内容，顶栏让路；
 *    往回滚说明在找导航，立刻回来。停在地面时收缩一点（68 → 58）。
 * 3) 「我们的服务」「我们的产品」是**通栏 mega 面板**（和顶栏同宽、整条展开），
 *    不再是挂在导航项下面的小下拉 —— 参照腾讯官网的做法。
 *    事件模型：nav-item 的 mouseenter / focusin 开面板；
 *    整个 header 的 mouseleave / focusout（焦点离开 header）关面板。
 *    这样鼠标从导航项移进面板不会断，面板和顶栏在同一个 hover 区里。
 * 4) logo 是内联 SVG 画的，不依赖图片文件。图形标蓝底白 w + 蓝色 wordmark。
 *    如果之后有了正式 logo 文件，丢进 src/assets/images/logo-witkit.svg 就自动接管。
 * 5) 文案全部走 t()（i18n）。面板里的数据（serviceMenu / productGroups）在模板里
 *    用 `t(s.desc)` 这样包一层即可 —— 中文原文就是 key，不用另起一张表。
 * 6) 「开发者」2026-09-20 起也挂通栏面板（用户拍板，和服务/产品一致）：左边 4 个站外入口、
 *    右边 2 个实验室，底部 foot 出口到 /developers。清单数据仍只有 src/data/developers.ts 一份，
 *    面板和页面读同一份，不维护两遍。
 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { imageUrl } from "../assets/imageRegistry";
import { devEntries, labLinks } from "../data/developers";
import { flagship, productGroups } from "../data/products";
import { t } from "../i18n";
import LangSwitch from "./LangSwitch.vue";

/* 导航数据：结构稳定，直接写在前端，不走接口。
   面板里每一项都指向真实存在的路由，不留死链。
   desc 与 src/mocks/data.ts 里同名体系的 description 逐字一致 ——
   顶栏和正文页说的是同一句话，改一处必须改另一处。 */

/* ⚠️ blurb 的写法：**只回答「这服务是干啥的」，不写内部怎么设计。**
   用户 2026-09-20（附截图）：「在导航栏里的描述能不能简单一些，要知道这服务是干啥的，
   像这一个我就觉得很难知道到底是做什么的服务。」

   改前三条都是「从里往外写」——
     HEC「…第三方按标准协议接入」   行话，读者不知道能拿到什么
     UEF「…共用一套工程规范」       这是我们的内部收益，不是用户能做的事
     CEP「…共用一套配额与监控」     同上；而且前半只是个名词罗列，没说拿来干嘛
   改后统一成「**具体提供什么 + 一句最实在的用处**」，两条短句、不加从句：
   一条一行（卡片文字列 371px / 15px，约 24 个汉字为上限），超了就折行、面板变高。

   ⚠️ 事实一律从 `src/mocks/data.ts` 取，不许为了好懂而编能力
   （如 CEP 的「一次接入即可使用」就是 data.ts 原文）。 */
const serviceMenu = [
  {
    slug: "hec",
    name: "HEC",
    layer: "接入层",
    desc: "全域互联与统一授权",
    blurb: "统一登录与权限，一份身份跨所有产品通用。",
  },
  {
    slug: "uef",
    name: "UEF",
    layer: "执行层",
    desc: "AI 驱动的全栈执行架构",
    blurb: "从写代码到发布上线的开发平台，内置 AI 能力。",
  },
  {
    slug: "cep",
    name: "CEP",
    layer: "数据层",
    desc: "企业级云能力平台",
    blurb: "云数据库、对象存储与人机验证，接入一次就能用。",
  },
];

/* 产品清单在 src/data/products.ts —— 与页脚的产品链接共用同一份。
   面板只写名字、不写小字介绍（用户明确要求）；url 是产品真实站点，点一下直接跳过去。 */

const route = useRoute();

const headerEl = ref<HTMLElement | null>(null);
const scrolled = ref(false);
const hidden = ref(false);
const mobileOpen = ref(false);
const openMenu = ref<"service" | "product" | "dev" | null>(null);

/* 顶栏 logo：图到位就用图，没到位用内联 SVG + 文字 wordmark 兜着。
   顶栏不挂虚线占位框——那里挂空框会让整站看起来是坏的。 */
const logoUrl = computed(() => imageUrl("logo-witkit"));

/* 归属高亮：子页面（/tech/:slug、/product/:slug）也要把父级导航点亮 */
/* 「关于我们」就是首页（/）—— 这一站的门面页，所以它的当前态看根路径。 */
const isHome = computed(() => route.path === "/");
const isService = computed(
  () => route.path === "/services" || route.path.startsWith("/tech/"),
);
const isProduct = computed(
  () => route.path === "/products" || route.path.startsWith("/product/"),
);
const isNews = computed(() => route.path.startsWith("/news"));
const isDev = computed(() => route.path.startsWith("/developers"));

let lastY = 0;
/* 首次回调只用来对齐基准，不判定方向。
   否则用户从历史记录带着滚动位置进来时，第一帧就会被判成「正在下滑」而收掉顶栏。 */
let armed = false;

function onScroll() {
  const y = window.scrollY;
  const dy = y - lastY;

  scrolled.value = y > 8;

  /* 面板/移动菜单展开时不收顶栏，否则鼠标还没落到菜单上顶栏就跑了 */
  if (!openMenu.value && !mobileOpen.value) {
    if (!armed || y <= 72) hidden.value = false;
    else if (dy > 6) hidden.value = true;
    else if (dy < -6) hidden.value = false;
  }

  lastY = y;
  armed = true;
}

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});
onUnmounted(() => window.removeEventListener("scroll", onScroll));

/* 换页时把状态清干净：菜单收起、顶栏回到可视 */
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
    openMenu.value = null;
    hidden.value = false;
    lastY = window.scrollY;
  },
);

function closeAll() {
  mobileOpen.value = false;
  openMenu.value = null;
}

/* 键盘焦点离开 header（含面板）才关面板；
   焦点在 导航 → 面板 之间移动时保持展开 */
function onHeaderFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null;
  if (next && headerEl.value?.contains(next)) return;
  openMenu.value = null;
}
</script>

<template>
  <header
    ref="headerEl"
    class="header"
    :class="{ scrolled, compact: scrolled, hidden, 'menu-open': !!openMenu }"
    @mouseleave="openMenu = null"
    @focusout="onHeaderFocusOut"
  >
    <div class="header-inner">
      <RouterLink
        to="/"
        class="logo"
        :aria-label="t('witkit 妙计科技 首页')"
        @click="closeAll"
      >
        <img
          v-if="logoUrl"
          :src="logoUrl"
          :alt="t('witkit 妙计科技')"
          class="logo-img"
          width="630"
          height="120"
        />
        <template v-else>
          <span class="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <rect class="lm-bg" width="40" height="40" rx="11" />
              <path class="lm-w" d="M9.5 13.2 13.1 26.8 17.1 17.6 21.1 26.8 24.7 13.2" />
            </svg>
          </span>
          <span class="logo-text">
            <span class="logo-en">witkit</span>
            <span class="logo-cn">妙计科技</span>
          </span>
        </template>
      </RouterLink>

      <nav class="nav-desktop" :aria-label="t('主导航')">
        <RouterLink to="/" class="nav-link" :class="{ current: isHome }" @click="closeAll">
          {{ t("关于我们") }}
        </RouterLink>

        <!-- 我们的服务：hover / focus 进来开通栏面板 -->
        <div class="nav-item" @mouseenter="openMenu = 'service'" @focusin="openMenu = 'service'">
          <RouterLink
            to="/services"
            class="nav-link"
            :class="{ current: isService, active: openMenu === 'service' }"
            :aria-expanded="openMenu === 'service'"
            @click="closeAll"
          >
            {{ t("我们的服务") }}
            <svg class="caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 3.5 5 7.5 9 3.5" fill="none" stroke="currentColor" stroke-width="1.4" />
            </svg>
          </RouterLink>
        </div>

        <!-- 我们的产品 -->
        <div class="nav-item" @mouseenter="openMenu = 'product'" @focusin="openMenu = 'product'">
          <RouterLink
            to="/products"
            class="nav-link"
            :class="{ current: isProduct, active: openMenu === 'product' }"
            :aria-expanded="openMenu === 'product'"
            @click="closeAll"
          >
            {{ t("我们的产品") }}
            <svg class="caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 3.5 5 7.5 9 3.5" fill="none" stroke="currentColor" stroke-width="1.4" />
            </svg>
          </RouterLink>
        </div>

        <!-- 开发者：hover / focus 进来开通栏面板 -->
        <div class="nav-item" @mouseenter="openMenu = 'dev'" @focusin="openMenu = 'dev'">
          <RouterLink
            to="/developers"
            class="nav-link"
            :class="{ current: isDev, active: openMenu === 'dev' }"
            :aria-expanded="openMenu === 'dev'"
            @click="closeAll"
          >
            {{ t("开发者") }}
            <svg class="caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 3.5 5 7.5 9 3.5" fill="none" stroke="currentColor" stroke-width="1.4" />
            </svg>
          </RouterLink>
        </div>

        <RouterLink to="/news" class="nav-link" :class="{ current: isNews }" @click="closeAll">
          {{ t("新闻动态") }}
        </RouterLink>

        <!-- 加入我们：直接跳首页「联系我们」锚点（用户 2026-09-20 决定不再单独建招聘页） -->
        <RouterLink to="/#contact" class="nav-link" @click="closeAll">
          {{ t("加入我们") }}
        </RouterLink>
      </nav>

      <div class="header-right">
        <!-- 三档语言切换：简 / 繁 / EN -->
        <LangSwitch />
        <button
          class="nav-toggle"
          :aria-expanded="mobileOpen"
          :aria-label="t('打开菜单')"
          @click="mobileOpen = !mobileOpen"
        >
          <span class="toggle-bar" :class="{ open: mobileOpen }"></span>
        </button>
      </div>
    </div>

    <!-- ═══ 通栏面板：我们的服务 ═══
         和顶栏同宽（1560 内容区），整条展开，不是挂在导航项下的小下拉 -->
    <div class="mega" :class="{ open: openMenu === 'service' }">
      <div class="mega-inner">
        <div class="mega-grid mega-grid-svc">
          <RouterLink
            v-for="s in serviceMenu"
            :key="s.slug"
            :to="`/tech/${s.slug}`"
            class="mega-card"
            @click="closeAll"
          >
            <span class="mc-top">
              <span class="mc-code">{{ s.name }}</span>
              <span class="mc-layer">{{ t(s.layer) }}</span>
            </span>
            <span class="mc-name">{{ t(s.desc) }}</span>
            <span class="mc-blurb">{{ t(s.blurb) }}</span>
            <span class="mc-cta">
              {{ t("进入 {name} 技术体系", { name: s.name }) }} <i class="arrow">→</i>
            </span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- ═══ 通栏面板：我们的产品 ═══ -->
    <div class="mega" :class="{ open: openMenu === 'product' }">
      <div class="mega-inner">
        <div class="mega-grid mega-grid-prod">
          <div v-for="g in productGroups" :key="g.title" class="mega-col">
            <p class="mega-col-title">{{ t(g.title) }}</p>
            <!-- 只写产品名，点一下直接跳到产品的真实站点 -->
            <a
              v-for="p in g.items"
              :key="p.name"
              :href="p.url"
              target="_blank"
              rel="noopener"
              class="mp-item"
              @click="closeAll"
            >
              <span class="mp-name">{{ t(p.name) }}</span>
              <span class="mp-arrow" aria-hidden="true">↗</span>
            </a>
          </div>

          <!-- 旗舰推荐位：面板最右一栏，视觉收口 -->
          <aside class="mega-promo">
            <p class="mega-promo-label">{{ t("旗舰产品") }}</p>
            <p class="mega-promo-name">{{ t(flagship.name) }}</p>
            <p class="mega-promo-desc">
              {{ t("AI 驱动的智能云端开发环境，浏览器里打开就能写、能跑、能部署。") }}
            </p>
            <a
              :href="flagship.url"
              target="_blank"
              rel="noopener"
              class="btn btn-primary mega-promo-btn"
              @click="closeAll"
            >
              {{ t("前往 {name}", { name: t(flagship.name) }) }}
            </a>
          </aside>
        </div>
      </div>
    </div>

    <!-- ═══ 通栏面板：开发者 ═══
         左栏 4 个站外入口、右栏 2 个实验室，底部出口到 /developers。 -->
    <div class="mega" :class="{ open: openMenu === 'dev' }">
      <div class="mega-inner">
        <div class="mega-grid mega-grid-dev">
          <div class="mega-col">
            <p class="mega-col-title">{{ t("开发者入口") }}</p>
            <a
              v-for="d in devEntries"
              :key="d.name"
              :href="d.url"
              target="_blank"
              rel="noopener"
              class="mp-item"
              @click="closeAll"
            >
              <span class="mp-name">{{ t(d.name) }}</span>
              <span class="mp-arrow" aria-hidden="true">↗</span>
            </a>
          </div>

          <div class="mega-col">
            <p class="mega-col-title">{{ t("实验室") }}</p>
            <a
              v-for="lab in labLinks"
              :key="lab.name"
              :href="lab.url"
              target="_blank"
              rel="noopener"
              class="mp-item"
              @click="closeAll"
            >
              <span class="mp-name">{{ t(lab.name) }}</span>
              <span class="mp-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端菜单 -->
    <nav v-if="mobileOpen" class="nav-mobile" :aria-label="t('移动端导航')">
      <RouterLink to="/" class="nm-link" @click="closeAll">{{ t("关于我们") }}</RouterLink>

      <p class="nm-group">{{ t("我们的服务 · 三大自研技术体系") }}</p>
      <RouterLink to="/services" class="nm-link nm-link-sub" @click="closeAll">
        {{ t("服务体系总览") }}
      </RouterLink>
      <RouterLink
        v-for="s in serviceMenu"
        :key="s.slug"
        :to="`/tech/${s.slug}`"
        class="nm-link nm-link-sub"
        @click="closeAll"
      >
        {{ t(s.name) }} · {{ t(s.desc) }}
      </RouterLink>

      <p class="nm-group">{{ t("我们的产品") }}</p>
      <RouterLink to="/products" class="nm-link nm-link-sub" @click="closeAll">
        {{ t("全部产品") }}
      </RouterLink>
      <template v-for="g in productGroups" :key="g.title">
        <a
          v-for="p in g.items"
          :key="p.name"
          :href="p.url"
          target="_blank"
          rel="noopener"
          class="nm-link nm-link-sub"
          @click="closeAll"
        >
          {{ t(p.name) }}
        </a>
      </template>

      <p class="nm-group">{{ t("开发者") }}</p>
      <RouterLink to="/developers" class="nm-link nm-link-sub" @click="closeAll">
        {{ t("开发者总览") }}
      </RouterLink>
      <a
        v-for="d in devEntries"
        :key="d.name"
        :href="d.url"
        target="_blank"
        rel="noopener"
        class="nm-link nm-link-sub"
        @click="closeAll"
      >
        {{ t(d.name) }}
      </a>
      <a
        v-for="lab in labLinks"
        :key="lab.name"
        :href="lab.url"
        target="_blank"
        rel="noopener"
        class="nm-link nm-link-sub"
        @click="closeAll"
      >
        {{ t(lab.name) }}
      </a>

      <p class="nm-group">{{ t("公司") }}</p>
      <RouterLink to="/news" class="nm-link" @click="closeAll">{{ t("新闻动态") }}</RouterLink>
      <RouterLink to="/#contact" class="nm-link" @click="closeAll">
        {{ t("联系我们") }}
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
/* ═══ 外壳 ═══ */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--color-bg);
  border-bottom: 1px solid transparent;
  transform: translateY(0);
  transition:
    transform var(--motion-duration-normal) var(--motion-ease-out),
    border-color var(--motion-duration-fast) var(--motion-ease-out),
    box-shadow var(--motion-duration-fast) var(--motion-ease-out);
}

.header.scrolled {
  border-bottom-color: var(--color-line);
  box-shadow: var(--shadow-sm);
}

/* 面板展开时：顶栏与面板之间不能有线，要完全咬合成一块 */
.header.menu-open {
  border-bottom-color: transparent;
  box-shadow: none;
}

/* 下滑让路 —— 顶栏整体滑出视口 */
.header.hidden {
  transform: translateY(-100%);
}

/* ═══ 内容区：铺满视口宽度（与通栏面板同宽） ═══
   max-width 走 token，现在是 100% —— 顶栏不再被某个最大宽度框住，
   logo 贴屏幕左、最后一项导航贴屏幕右，和面板的左右边缘严格对齐。 */
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  width: 100%;
  max-width: var(--layout-w-header);
  margin: 0 auto;
  padding: 0 var(--layout-pad-header);
  height: 72px;
  transition: height var(--motion-duration-normal) var(--motion-ease-out);
}

.header.compact .header-inner {
  height: 62px;
}

/* ═══ Logo ═══ */
.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: none;
}

.logo-mark {
  display: block;
  flex: none;
  width: 36px;
  height: 36px;
  transition: width var(--motion-duration-normal) var(--motion-ease-out), height
    var(--motion-duration-normal) var(--motion-ease-out);
}

.header.compact .logo-mark {
  width: 30px;
  height: 30px;
}

.logo-mark svg {
  width: 100%;
  height: 100%;
}

.lm-bg {
  fill: var(--color-accent);
}

.lm-w {
  fill: none;
  stroke: var(--color-ink-inverse);
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.logo-en {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-accent);
}

.logo-cn {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.16em;
  color: var(--color-ink-tertiary);
}

.header.compact .logo-en {
  font-size: 19px;
}

.logo-img {
  display: block;
  height: 36px;
  width: auto;
}

.header.compact .logo-img {
  height: 31px;
}

/* ═══ 桌面导航 ═══
   间距参照腾讯官网：每一项左右各 24px 内边距 + 8px 间隔，
   相邻两项文字之间空 56px —— 导航条铺开得够宽，不是挤成一小撮。 */
.nav-desktop {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.nav-item {
  position: relative;
}

/* 最后一项去掉右侧内边距：不然文字会比容器边缘缩进 24px，
   logo 是贴边的，右边不贴边在宽屏上看得出来。 */
.nav-desktop > .nav-link:last-child,
.nav-desktop > .nav-item:last-child .nav-link {
  padding-right: 0;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  /* 文字与下拉箭头的间距：用户反馈"和这个图标太近了"，从 5px 拉到 8px */
  gap: var(--space-2);
  height: 46px;
  padding: 0 var(--space-5);
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-ink-secondary);
  border-radius: var(--radius-sm);
  transition: color var(--motion-duration-fast) var(--motion-ease-out);
}

.nav-link:hover,
.nav-link.active {
  color: var(--color-accent);
}

/* 当前页：文字变蓝 + 底部一根短横线，比整块底色克制 */
.nav-link.current {
  color: var(--color-accent);
  position: relative;
}

.nav-link.current::after {
  content: "";
  position: absolute;
  left: var(--space-5);
  right: var(--space-5);
  bottom: 8px;
  height: 2px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
}

.caret {
  transition: transform var(--motion-duration-fast) var(--motion-ease-out);
}

.nav-link.active .caret {
  transform: rotate(180deg);
}

/* ═══════════════════════════════════════════
   通栏 Mega 面板
   和顶栏同宽：left:0 right:0 整条展开，
   内容用同一个 1560 容器，与顶栏 logo / 导航严格对齐。
   ═══════════════════════════════════════════ */
.mega {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-line);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition:
    opacity var(--motion-duration-fast) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out),
    visibility var(--motion-duration-fast);
}

.mega.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.mega-inner {
  max-width: var(--layout-w-header);
  margin: 0 auto;
  padding: var(--space-7) var(--layout-pad-header) var(--space-5);
}

/* ── 服务面板：三大体系大卡片 ── */
.mega-grid-svc {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.mega-card {
  display: flex;
  flex-direction: column;
  /* 卡片内各层的呼吸感：用户反馈"大标题和小标题隔得太近了"，12px → 16px */
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  transition:
    border-color var(--motion-duration-fast) var(--motion-ease-out),
    background-color var(--motion-duration-fast) var(--motion-ease-out);
}

.mega-card:hover {
  border-color: var(--color-accent);
  background: var(--color-bg);
}

.mc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mc-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
}

.mc-layer {
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

.mc-name {
  /* 与上方代号块再多让一点位置：代号块有视觉重量，等距看着还是挤 */
  margin-top: var(--space-1);
  font-size: var(--font-size-lg);
  font-weight: 600;
  line-height: var(--font-line-height-snug);
  color: var(--color-ink);
}

.mega-card:hover .mc-name {
  color: var(--color-accent);
}

.mc-blurb {
  font-size: var(--font-size-sm);
  line-height: var(--font-line-height-normal);
  color: var(--color-ink-secondary);
}

.mc-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-line);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-ink-secondary);
  transition: color var(--motion-duration-fast) var(--motion-ease-out);
}

.mega-card:hover .mc-cta {
  color: var(--color-accent);
}

.mc-cta .arrow {
  font-style: normal;
  transition: transform var(--motion-duration-fast) var(--motion-ease-out);
}

.mega-card:hover .mc-cta .arrow {
  transform: translateX(3px);
}

/* ── 产品面板：四列分类（12 个产品一次列全）+ 旗舰推荐位 ── */
.mega-grid-prod {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) 280px;
  gap: var(--space-6);
}

/* ── 开发者面板：左 4 入口 + 右 2 实验室 ──
   去掉了原来的 max-width:560px（把两列死死挤在面板左边）。
   现在两列铺满面板整宽，入口一列占 4/6、实验室一列占 2/6 ——
   4 条入口天然比 2 个实验室长，按内容比例分宽，右侧不再空一大片。 */
.mega-grid-dev {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 2fr);
  gap: var(--space-6);
}

.mega-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.mega-col-title {
  padding: var(--space-1) var(--space-3) var(--space-4);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

/* 产品项：只有名字 + 一个外链标记，没有小字说明 */
.mp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  transition: background-color var(--motion-duration-fast) var(--motion-ease-out);
}

.mp-item:hover {
  background: var(--color-accent-soft);
}

.mp-name {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-ink);
}

.mp-item:hover .mp-name {
  color: var(--color-accent);
}

/* 外链标记：平时淡着，悬停变蓝并往右上走，一眼知道点了会跳走 */
.mp-arrow {
  flex: none;
  font-size: var(--font-size-sm);
  color: var(--color-ink-tertiary);
  opacity: 0.4;
  transition:
    opacity var(--motion-duration-fast) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out),
    color var(--motion-duration-fast) var(--motion-ease-out);
}

.mp-item:hover .mp-arrow {
  opacity: 1;
  color: var(--color-accent);
  transform: translate(2px, -2px);
}

/* 旗舰推荐位 */
.mega-promo {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-bg-subtle);
  border-radius: var(--radius-lg);
}

.mega-promo-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

.mega-promo-name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-ink);
}

.mega-promo-desc {
  font-size: var(--font-size-xs);
  line-height: var(--font-line-height-normal);
  color: var(--color-ink-secondary);
}

.mega-promo-btn {
  width: 100%;
  margin-top: auto;
  font-size: var(--font-size-sm);
}

/* ═══ 右侧 ═══ */
/* 桌面端右侧不放按钮：导航本身已经贴到最右边，这是腾讯 / 字节那一类站点的做法。
   「联系我们」不占顶栏位置，它出现在页脚、首页 CTA 带和关于页里。 */
.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  /* 与导航末项拉开：导航最后一项去掉了右内边距，直接接语言切换会贴住 */
  margin-left: var(--space-5);
  flex: none;
}

.nav-toggle {
  display: none;
  position: relative;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
}

.toggle-bar,
.toggle-bar::before,
.toggle-bar::after {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--color-ink);
  border-radius: var(--radius-full);
  transition: transform var(--motion-duration-fast) var(--motion-ease-out);
}

.toggle-bar::before,
.toggle-bar::after {
  content: "";
  position: absolute;
  left: 12px;
}

.toggle-bar::before {
  transform: translateY(-6px);
}

.toggle-bar::after {
  transform: translateY(6px);
}

.toggle-bar.open {
  background: transparent;
}

.toggle-bar.open::before {
  transform: rotate(45deg);
}

.toggle-bar.open::after {
  transform: rotate(-45deg);
}

/* ═══ 移动端 ═══ */
.nav-mobile {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 72px);
  overflow-y: auto;
  padding: var(--space-4) var(--layout-pad) var(--space-6);
  border-top: 1px solid var(--color-line);
  background: var(--color-bg);
  box-shadow: var(--shadow-md);
}

.nm-group {
  padding: var(--space-4) 0 var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

.nm-link {
  display: block;
  padding: var(--space-3) 0;
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-ink);
  border-bottom: 1px solid var(--color-line);
}

.nm-link-sub {
  font-size: var(--font-size-sm);
  font-weight: 400;
  color: var(--color-ink-secondary);
}

/* ═══ 响应式 ═══ */
@media (max-width: 1280px) {
  /* 窄桌面：产品面板推荐位收窄，三列分组保持 */
  .mega-grid-prod {
    grid-template-columns: repeat(3, minmax(0, 1fr)) 248px;
    gap: var(--space-5);
  }
}

@media (max-width: 1200px) {
  .nav-link {
    padding: 0 var(--space-3);
  }
}

@media (max-width: 1024px) {
  .nav-desktop {
    display: none;
  }
  .nav-toggle {
    display: flex;
  }
  /* 移动端没有 hover 导航，通栏面板一并关掉 */
  .mega {
    display: none;
  }
}
</style>

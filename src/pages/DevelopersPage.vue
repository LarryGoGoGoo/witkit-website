<script setup lang="ts">
/**
 * 开发者
 *
 * 这一页只干一件事：把散在各处的开发者入口列清楚 ——
 * 四个站外入口（产品导航 / 开发者中心 / 代码托管 / 技术论坛）+ 两个实验室。
 *
 * 为什么单独开一页（用户 2026-09-20 决定）：
 * 实验室不放在首页（首页＝关于我们，用户明确要求那里不放产品与服务清单），
 * 但也不该只藏在页脚一行小链接里 —— 页脚那一列是入口索引，放不下说明。
 * 于是把页脚「开发者」那一列升级成一页，顶栏跟着加一项。
 *
 * 两条纪律：
 * 1) 四个入口都是**站外站点**，页面只做入口，不转述各站内容 ——
 *    替别人的站说它有什么，写出来就是编（实验室那轮吃过这个亏）。
 *    但「只做入口」不等于「只罗列名字」：每个入口配一句 blurb，
 *    解释这个入口是干嘛的（基于名称与域名），不描述那个站里有什么功能。
 * 2) 实验室卡片的内容（description / focus）走 /api/team，与后端契约一致，
 *    不在这页里另抄一份。
 */
import { onMounted, ref } from "vue";
import { api } from "../api/client";
import type { Lab } from "../api/types";
import BlueprintGrid from "../components/deco/BlueprintGrid.vue";
import CornerFrame from "../components/deco/CornerFrame.vue";
import HeroSpec from "../components/deco/HeroSpec.vue";
import { devEntries } from "../data/developers";
import { t } from "../i18n";

const labs = ref<Lab[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    /* 实验室数据走 api.getTeam()（本地 mock 层），这里只取 labs ——
       metrics 是团队规模那类数字，不属于这一页。 */
    const res = await api.getTeam();
    labs.value = res.labs ?? [];
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
      <HeroSpec label="开发者入口" code="03" />
      <div class="container-page inner">
        <nav class="crumb" :aria-label="t('面包屑')">
          <RouterLink to="/">{{ t("首页") }}</RouterLink>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ t("开发者") }}</span>
        </nav>

        <p class="page-label">{{ t("开发者") }}</p>
        <h1 class="page-title">{{ t("面向开发者的入口索引") }}</h1>
        <!-- 句子不换行：裸文本节点跨行会被 HTML 插进一个空格（中文里看得见）。
             ⚠️ 只写「入口怎么组织」，不写「那些站里有什么」——
             developers.ts 顶部写死了这条纪律：替别人的站点说它有什么，写出来就是编。
             同理也不写「账号体系是否互通」—— 那是别的站的内情，我们没有出处。 -->
        <p class="page-desc">
          {{
            t(
              "开发相关入口按用途归为四类：产品索引、开发者中心、代码托管与技术社区。",
            )
          }}
        </p>
      </div>
    </section>

    <!-- ═══ 开发者入口：四张入口卡 ═══ -->
    <section class="section">
      <div class="container-page">
        <header class="section-head" v-reveal>
          <p class="section-label">{{ t("开发者入口") }}</p>
          <h2 class="section-title">{{ t("四个独立站点") }}</h2>
          <p class="section-desc">
            {{ t("每个入口解释一句用途，站点内容以各站自身为准，点击后于新窗口打开。") }}
          </p>
        </header>

        <div class="dev-grid">
          <a
            v-for="(d, i) in devEntries"
            :key="d.name"
            v-reveal="60 * i"
            :href="d.url"
            target="_blank"
            rel="noopener"
            class="card dev-card"
          >
            <CornerFrame :len="16" />
            <span class="dev-no tnum">{{ d.no }}</span>
            <h3 class="dev-name">{{ t(d.name) }}</h3>
            <p class="dev-blurb">{{ t(d.blurb) }}</p>
            <span class="dev-foot">
              <span class="dev-host">{{ d.host }}</span>
              <span class="dev-mark" aria-hidden="true">↗</span>
            </span>
          </a>
        </div>
      </div>
    </section>

    <!-- ═══ 实验室 ═══ -->
    <section class="section section-subtle">
      <div class="container-page">
        <header class="section-head" v-reveal>
          <p class="section-label">{{ t("实验室") }}</p>
          <h2 class="section-title">{{ t("两个实验室") }}</h2>
          <p class="section-desc">{{ t("两个实验室各有独立站点，本页仅提供入口。") }}</p>
        </header>

        <p v-if="loading" class="state">{{ t("正在加载实验室…") }}</p>
        <p v-else-if="error" class="state state-error">{{ error }}</p>
        <div v-else class="lab-grid">
          <article
            v-for="(lab, i) in labs"
            :key="lab.slug"
            v-reveal="80 * i"
            class="card lab-card"
          >
            <p class="lab-kind">{{ t(lab.description) }}</p>
            <h3 class="lab-name">{{ t(lab.name) }}</h3>
            <p class="lab-focus">{{ t(lab.focus) }}</p>
            <a
              v-if="lab.url"
              :href="lab.url"
              target="_blank"
              rel="noopener"
              class="link-arrow lab-link"
            >
              {{ t("访问实验室") }} <span class="arrow">↗</span>
            </a>
          </article>
        </div>
      </div>
    </section>

    <!-- ═══ 出口 ═══ -->
    <section class="section">
      <div class="container-page">
        <div class="cta" v-reveal>
          <div class="cta-copy">
            <p class="section-label">{{ t("接着聊") }}</p>
            <h2 class="section-title">{{ t("合作或加入我们") }}</h2>
            <p class="section-desc">{{ t("产品合作、技术咨询与简历投递，均可直接联系我们。") }}</p>
          </div>
          <div class="cta-actions">
            <RouterLink to="/#contact" class="btn btn-primary">{{ t("联系我们") }}</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ═══ 页头：占满一屏（产品页、服务页同一套版式） ═══
   用户：「一点进去那个页面要把整个页面占满，下面正文的标题都看到了很不协调。」
   于是页头做成整屏：面包屑贴顶、标题簇居中、数字条贴底 ——
   首屏不再露出「开发者入口 / 四个独立站点」的区块头。
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
   上限 72px，与产品页 / 服务页同档。 */
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

/* 大标题左侧一条品牌蓝强调竖条（与产品页 / 服务页同款） */
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
   颜色用主文字黑（--color-ink）而非次要灰 —— 用户：「小字颜色深一些」。 */
.page-desc {
  max-width: var(--layout-w-prose);
  margin-top: var(--space-5);
  font-size: var(--font-size-lg);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink);
  /* 标题簇已由 .page-label 的 vh 上边距定在页头上部，这里不再补底部余量。 */
}

/* ═══ 开发者入口：四张入口卡 ═══
   从「四行清单」升级成四张卡片：编号 + 名称 + 一句用途 + 域名 + ↗。
   每张卡借 CornerFrame 断线角框收口，让一块块入口像图纸上的取景框，
   不再是一条条被横线隔开的目录行。 */
.dev-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-5);
}

.dev-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6);
  overflow: hidden;
}

.dev-card:hover {
  border-color: var(--color-accent);
}

.dev-no {
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
}

.dev-name {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-ink);
  transition: color var(--motion-duration-fast) var(--motion-ease-out);
}

.dev-card:hover .dev-name {
  color: var(--color-accent);
}

.dev-blurb {
  font-size: var(--font-size-base);
  line-height: var(--font-line-height-normal);
  color: var(--color-ink-secondary);
  flex: 1;
}

.dev-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-line);
}

.dev-host {
  font-size: var(--font-size-xs);
  color: var(--color-ink-tertiary);
}

.dev-mark {
  font-size: var(--font-size-lg);
  color: var(--color-ink-tertiary);
  transition:
    color var(--motion-duration-fast) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out);
}

.dev-card:hover .dev-mark {
  color: var(--color-accent);
  transform: translate(2px, -2px);
}

/* ═══ 实验室 ═══ */
.lab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: var(--space-5);
}

.lab-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6);
}

.lab-kind {
  font-size: var(--font-size-sm);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-accent);
}

.lab-name {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.lab-focus {
  font-size: var(--font-size-base);
  line-height: var(--font-line-height-normal);
  color: var(--color-ink-secondary);
}

.lab-link {
  margin-top: var(--space-3);
}

/* ═══ 出口 ═══ */
.cta {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) auto;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-8);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-xl);
}

.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
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
@media (max-width: 900px) {
  .cta {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }
}

@media (max-width: 1024px) {
  .dev-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-hero {
    padding-top: 104px;
  }
  .page-desc {
    font-size: var(--font-size-base);
  }
  /* 窄屏卡片单列即可，无需再拆域名行 */
  .dev-grid {
    grid-template-columns: 1fr;
  }
  .lab-grid {
    grid-template-columns: 1fr;
  }
  .cta {
    padding: var(--space-6);
  }
  .cta-actions {
    width: 100%;
  }
}
</style>

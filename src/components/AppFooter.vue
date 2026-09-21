<script setup lang="ts">
import { computed } from "vue";
import { imageUrl } from "../assets/imageRegistry";
import { devEntries, labLinks } from "../data/developers";
import { t } from "../i18n";

const year = new Date().getFullYear();

/* 页脚 logo：深色底，用反白版。图没到位时降级成文字 wordmark */
const logoUrl = computed(() => imageUrl("logo-witkit-inverse"));

/* 「开发者」一列（2026-09-20 起）：
   首项是本页 /developers，后面跟着四个站外入口与两个实验室 ——
   数据都从 src/data/developers.ts 来，与顶栏、开发者页共用同一份，不在这儿另抄。
   注意：这一列是**入口索引**，不是介绍；站外站点不给它们写小字说明。 */
const columns = [
  {
    title: "我们的服务",
    links: [
      { label: "服务体系总览", to: "/services", external: false },
      { label: "HEC · 全域互联", to: "/tech/hec", external: false },
      { label: "UEF · 全栈工程", to: "/tech/uef", external: false },
      { label: "CEP · 企业级云", to: "/tech/cep", external: false },
    ],
  },
  {
    title: "我们的产品",
    links: [
      { label: "全部产品", to: "/products", external: false },
      { label: "E时代IDE", to: "/product/ide", external: false },
      { label: "E时代云服务", to: "/product/cloud", external: false },
      { label: "WeAuth 微验", to: "/product/weauth", external: false },
      { label: "云数据库", to: "/product/ecd", external: false },
      { label: "云存储", to: "/product/eoss", external: false },
    ],
  },
  {
    title: "开发者",
    links: [
      { label: "开发者总览", to: "/developers", external: false },
      ...devEntries.map((d) => ({ label: d.name, to: d.url, external: true })),
      ...labLinks.map((l) => ({ label: l.name, to: l.url, external: true })),
    ],
  },
  {
    title: "公司",
    links: [
      { label: "关于我们", to: "/", external: false },
      { label: "新闻动态", to: "/news", external: false },
      { label: "联系我们", to: "/#contact", external: false },
    ],
  },
];
</script>

<template>
  <footer class="footer">
    <div class="container-page footer-main">
      <!-- 品牌区：图片键 logo-witkit-inverse（深色底反白版，320×80） -->
      <div class="footer-brand">
        <div class="brand-lockup">
          <img
            v-if="logoUrl"
            :src="logoUrl"
            :alt="t('witkit 妙计科技')"
            class="brand-logo"
            width="176"
            height="44"
          />
          <template v-else>
            <span class="brand-en">witkit</span>
            <span class="brand-cn">妙计科技</span>
          </template>
        </div>
        <p class="brand-tagline">
          {{ t("以科技聚力改变未来。") }}
        </p>
        <!-- 品牌域名原本写死「emoera.com」。用户 2026-09-20 说明：
             emoera.com 是 E时代社团的域名，不是公司的，公司站用什么域名他之后给。
             域名没定之前不在页脚亮任何一个 —— 印错比空着难改（改版时没人会回来找这一行）。
             域名定了加回这里即可，class 用 brand-domain。 -->
      </div>

      <nav class="footer-cols" :aria-label="t('页脚导航')">
        <div v-for="col in columns" :key="col.title" class="footer-col">
          <h3 class="col-title">{{ t(col.title) }}</h3>
          <template v-for="l in col.links" :key="l.label">
            <a v-if="l.external" :href="l.to" target="_blank" rel="noopener" class="col-link">
              {{ t(l.label) }}
            </a>
            <RouterLink v-else :to="l.to" class="col-link">{{ t(l.label) }}</RouterLink>
          </template>
        </div>
      </nav>
    </div>

    <div class="container-page footer-bottom">
      <span>{{ t("© {year} witkit 妙计科技 · 保留所有权利", { year }) }}</span>
      <span class="footer-meta">
        <a href="https://nav.emoera.com/" target="_blank" rel="noopener">{{ t("产品导航") }}</a>
        <i></i>
        <a href="https://developer.emoera.com/" target="_blank" rel="noopener">
          {{ t("开发者中心") }}
        </a>
      </span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: relative;
  padding: var(--space-9) 0 var(--space-5);
  background: var(--color-bg-ink-footer);
  color: var(--color-ink-inverse);
  overflow: hidden;
}

.footer-main,
.footer-bottom {
  position: relative;
  z-index: 1;
}

.footer-main {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 2.4fr);
  gap: var(--space-9);
}

.brand-lockup {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.brand-logo {
  display: block;
  height: 44px;
  width: auto;
}

.brand-en {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  letter-spacing: var(--font-letter-spacing-tight);
}

.brand-cn {
  font-size: var(--font-size-sm);
  color: var(--color-ink-inverse-dim);
}

.brand-tagline {
  margin-top: var(--space-4);
  max-width: 280px;
  font-size: var(--font-size-sm);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-inverse-dim);
}

.footer-cols {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-6);
}

.col-title {
  margin-bottom: var(--space-4);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-ink-inverse);
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.col-link {
  font-size: var(--font-size-sm);
  line-height: var(--font-line-height-snug);
  color: var(--color-ink-inverse-dim);
  transition: color var(--motion-duration-fast) var(--motion-ease-out);
}

.col-link:hover {
  color: var(--color-ink-inverse);
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-8);
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-line-inverse);
  font-size: var(--font-size-xs);
  color: var(--color-ink-inverse-dim);
}

.footer-meta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
}

.footer-meta a:hover {
  color: var(--color-ink-inverse);
}

.footer-meta i {
  width: 1px;
  height: 10px;
  background: var(--color-line-inverse);
}

@media (max-width: 900px) {
  .footer-main {
    grid-template-columns: 1fr;
    gap: var(--space-7);
  }
  .footer-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-6);
  }
  .footer-bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
}
</style>

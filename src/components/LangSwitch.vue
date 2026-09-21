<script setup lang="ts">
import { LOCALES, locale, setLocale, t } from "../i18n";

/* 顶栏右侧的语言切换：简 / 繁（2026-09-20 起砍掉英文，只留两档）。
   当前项用品牌蓝 + 加粗，其余是三级灰，悬停变蓝。

   两个细节：
   1. 「简 / 繁」是语言的自称，任何语言下都保持原样，不进译文表（见 build-i18n.mjs 白名单）。
   2. aria-label 走 t()，读屏软件按当前语言朗读。 */
</script>

<template>
  <div class="lang" role="group" :aria-label="t('语言')">
    <button
      v-for="l in LOCALES"
      :key="l.code"
      type="button"
      class="lang-btn"
      :class="{ current: locale === l.code }"
      :aria-pressed="locale === l.code"
      @click="setLocale(l.code)"
    >
      {{ l.label }}
    </button>
  </div>
</template>

<style scoped>
.lang {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex: none;
}

.lang-btn {
  min-width: 26px;
  padding: 0 var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1;
  color: var(--color-ink-tertiary);
  border-radius: var(--radius-sm);
  transition: color var(--motion-duration-fast) var(--motion-ease-out);
}

.lang-btn:hover {
  color: var(--color-accent);
}

.lang-btn.current {
  color: var(--color-accent);
  font-weight: 600;
}
</style>

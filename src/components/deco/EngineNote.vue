<script setup lang="ts">
/**
 * 工程标注 —— 图纸上的引线注释。
 * 一条折线引线 + 端点小圆 + 一行小字，用来给页面上的元素做「技术注脚」，
 * 例如在架构图旁边标一句「UEF · 统一运行时」。
 *
 * side: left 时引线向左折出，right 时向右。
 */
withDefaults(defineProps<{ label: string; side?: "left" | "right" }>(), {
  side: "right",
});
</script>

<template>
  <div class="note" :class="`side-${side}`" aria-hidden="true">
    <span class="dot"></span>
    <svg class="leader" viewBox="0 0 48 16" preserveAspectRatio="none">
      <path d="M0 0 H24 L34 16 H48" fill="none" stroke="currentColor" stroke-width="1" />
    </svg>
    <span class="label">{{ label }}</span>
  </div>
</template>

<style scoped>
.note {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-line-strong);
}

.side-left {
  flex-direction: row-reverse;
}

.dot {
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-ink-tertiary);
  background: var(--color-bg);
}

.leader {
  width: 40px;
  height: 14px;
  flex: none;
}

.label {
  font-size: var(--font-size-xs);
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
  white-space: nowrap;
}
</style>

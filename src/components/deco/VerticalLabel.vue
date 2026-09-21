<script setup lang="ts">
/**
 * 竖排文字 —— 中文传统排布，从右往左读。
 * 中文站点里极少见，但它天然带「中式工程图纸」的味道。
 * 只在宽屏出现（窄屏空间不够，直接隐藏），且永远不承载关键信息。
 */
defineProps<{ text: string }>();
</script>

<template>
  <span class="vtext" aria-hidden="true">{{ text }}</span>
</template>

<style scoped>
.vtext {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: var(--font-size-xs);
  letter-spacing: 0.3em;
  color: var(--color-ink-tertiary);
  opacity: 0.55;
  user-select: none;
}

@media (max-width: 1200px) {
  .vtext {
    display: none;
  }
}
</style>

<script setup lang="ts">
/**
 * 页头右下角的「图纸标注」装饰块。
 * 页头大标题上移后，右下角空出一块 —— 用工程图纸里最典型的两种元素填：
 *   ① 一条横向尺寸标注线（细线两端带端刻度，中间写编号小字，与 ImageSlot 占位框同一种语言）
 *   ② 一条品牌蓝渐变色带 + 一行竖排主题词（给页头一点能看见的色彩）
 * 纯装饰、不承载关键信息（aria-hidden），窄屏直接隐藏。
 *
 * 竖排主题词与编号属于「有意不翻」的制图标注（同顶栏品牌字标、图占位框 ph-hint 一类），
 * 硬编码中文，不走 t()。
 */
defineProps<{ label: string; code: string }>();
</script>

<template>
  <div class="spec" aria-hidden="true">
    <div class="spec-dim">
      <span class="spec-line"></span>
      <span class="spec-val tnum">{{ code }}</span>
    </div>
    <div class="spec-foot">
      <span class="spec-swatch"></span>
      <span class="spec-label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.spec {
  position: absolute;
  right: var(--space-8);
  bottom: var(--space-6);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-5);
  pointer-events: none;
}

/* 尺寸标注线：细线两端带端刻度，中间写编号 —— 工程图纸的做法 */
.spec-dim {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 220px;
}

.spec-line {
  position: relative;
  flex: 1;
  height: 1px;
  background: var(--color-line-strong);
}

.spec-line::before,
.spec-line::after {
  content: "";
  position: absolute;
  top: -3px;
  width: 1px;
  height: 7px;
  background: var(--color-line-strong);
}

.spec-line::before {
  left: 0;
}

.spec-line::after {
  right: 0;
}

.spec-val {
  font-size: var(--font-size-xs);
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-ink-tertiary);
  white-space: nowrap;
}

/* 品牌蓝色带 + 竖排主题词 */
.spec-foot {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}

.spec-swatch {
  width: 140px;
  height: 6px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    to left,
    var(--color-accent),
    color-mix(in oklab, var(--color-accent) 0%, transparent)
  );
}

.spec-label {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: var(--font-size-xs);
  letter-spacing: 0.3em;
  color: var(--color-ink-tertiary);
  opacity: 0.55;
}

@media (max-width: 768px) {
  .spec {
    display: none;
  }
}
</style>

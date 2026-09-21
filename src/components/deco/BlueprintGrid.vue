<script setup lang="ts">
/**
 * 蓝图网格底纹 —— 工程制图语言，不是光效。
 * 用极淡的正交网格交代「这里是技术公司的页面」，透明度压到几乎看不见，
 * 只在纯色区块里出现，不叠加在任何内容之上。
 *
 * variant:
 *   grid   标准正交网格（默认）
 *   dot    半色调点阵
 *   cross  网格 + 交点十字加粗（更像图纸）
 */
withDefaults(
  defineProps<{
    variant?: "grid" | "dot" | "cross";
    size?: number;
    fade?: boolean;
  }>(),
  { variant: "grid", size: 32, fade: true },
);
</script>

<template>
  <div
    class="blueprint"
    :class="[`is-${variant}`, { 'is-faded': fade }]"
    :style="{ '--grid-size': `${size}px`, '--grid-dot': `${size / 2}px` }"
    aria-hidden="true"
  ></div>
</template>

<style scoped>
.blueprint {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* 正交网格 */
.is-grid {
  background-image:
    linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
}

/* 网格 + 交点十字：更像工程图纸 */
.is-cross {
  background-image:
    linear-gradient(to right, var(--grid-line-strong) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line-strong) 1px, transparent 1px),
    radial-gradient(circle at 0 0, var(--grid-node) 1px, transparent 1.2px);
  background-size:
    var(--grid-size) var(--grid-size),
    var(--grid-size) var(--grid-size),
    var(--grid-size) var(--grid-size);
}

/* 半色调点阵 */
.is-dot {
  background-image: radial-gradient(circle, var(--grid-node) 1px, transparent 1.1px);
  background-size: var(--grid-size) var(--grid-size);
}

.is-faded {
  mask-image: radial-gradient(ellipse 90% 70% at 50% 40%, black 20%, transparent 85%);
  -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 40%, black 20%, transparent 85%);
}

.blueprint {
  --grid-line: color-mix(in oklab, var(--color-line) 70%, transparent);
  --grid-line-strong: color-mix(in oklab, var(--color-line) 90%, transparent);
  --grid-node: color-mix(in oklab, var(--color-line-strong) 80%, transparent);
}
</style>

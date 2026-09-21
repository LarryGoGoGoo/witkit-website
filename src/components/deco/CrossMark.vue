<script setup lang="ts">
/**
 * 十字准星标记 —— 工程图纸上的定位符号。
 * 用在区块角点、图片位四角、数据卡片的对齐点。
 * 极小的一个细节，但它让页面从「网页」变成「图纸」。
 */
withDefaults(defineProps<{ size?: number; accent?: boolean }>(), {
  size: 9,
  accent: false,
});
</script>

<template>
  <span
    class="cross"
    :class="{ accent }"
    :style="{ '--cross-size': `${size}px` }"
    aria-hidden="true"
  ></span>
</template>

<style scoped>
.cross {
  position: relative;
  display: block;
  width: var(--cross-size);
  height: var(--cross-size);
  flex: none;
}

.cross::before,
.cross::after {
  content: "";
  position: absolute;
  background: var(--color-line-strong);
}

/* 竖线 */
.cross::before {
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  transform: translateX(-50%);
}

/* 横线 */
.cross::after {
  top: 50%;
  left: 0;
  height: 1px;
  width: 100%;
  transform: translateY(-50%);
}

.cross.accent::before,
.cross.accent::after {
  background: var(--color-accent);
}
</style>

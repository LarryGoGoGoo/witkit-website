<script setup lang="ts">
/**
 * 断线角框 —— 不闭合的矩形边框，工程图纸的取景框。
 * 用在图片位、Hero 主视觉、深色 CTA 区块上，
 * 四个角落画一小段线，中间留空，比整圈边框透气得多。
 *
 * tone: line 常规（浅色底）  inverse 反白（深色底）
 */
withDefaults(defineProps<{ tone?: "line" | "inverse"; len?: number }>(), {
  tone: "line",
  len: 18,
});
</script>

<template>
  <div class="frame" :class="`tone-${tone}`" :style="{ '--len': `${len}px` }" aria-hidden="true">
    <span class="corner tl"></span>
    <span class="corner tr"></span>
    <span class="corner bl"></span>
    <span class="corner br"></span>
  </div>
</template>

<style scoped>
.frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.corner {
  position: absolute;
  width: var(--len);
  height: var(--len);
}

/* 每个角只用两条 1px 边线拼出来 */
.corner::before,
.corner::after {
  content: "";
  position: absolute;
  background: var(--frame-color);
}

.corner::before {
  width: 100%;
  height: 1px;
}

.corner::after {
  width: 1px;
  height: 100%;
}

.tl {
  top: 0;
  left: 0;
}
.tl::before {
  top: 0;
  left: 0;
}
.tl::after {
  top: 0;
  left: 0;
}

.tr {
  top: 0;
  right: 0;
}
.tr::before {
  top: 0;
  right: 0;
}
.tr::after {
  top: 0;
  right: 0;
}

.bl {
  bottom: 0;
  left: 0;
}
.bl::before {
  bottom: 0;
  left: 0;
}
.bl::after {
  bottom: 0;
  left: 0;
}

.br {
  bottom: 0;
  right: 0;
}
.br::before {
  bottom: 0;
  right: 0;
}
.br::after {
  bottom: 0;
  right: 0;
}

.tone-line {
  --frame-color: var(--color-line-strong);
}

.tone-inverse {
  --frame-color: var(--color-line-inverse);
}
</style>

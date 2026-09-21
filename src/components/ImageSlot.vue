<script setup lang="ts">
/**
 * 图片位
 *
 * 一张图到位了 → 直接渲染这张图。
 * 还没做 → 渲染一个「工程图纸风格」的占位框，框里写清楚这个位置要的是什么图：
 *          文件名、目标尺寸、内容要求。图一批批补，占位框就一个个消失。
 *
 * 规格（尺寸 / 内容要求 / 宽高比）统一从 imageSpecs 取，组件不用重复声明。
 * 这样占位框里显示的文字和《图片需求清单》永远一致。
 *
 * 顺带解决一个隐性问题：不写死图片路径，所以「图还没做」不会产生 404 请求，
 * 控制台干干净净（第 2 步「零 console 报错」的过关条件不会被图片拖累）。
 */
import { computed } from "vue";
import { imageUrl } from "../assets/imageRegistry";
import { specOf } from "../assets/imageSpecs";
import { t } from "../i18n";
import BlueprintGrid from "./deco/BlueprintGrid.vue";

const props = withDefaults(
  defineProps<{
    /** 图片键，等于 src/assets/images 下的相对路径去掉扩展名，如 products/ide */
    slot: string;
    /** 无障碍描述，图片加载失败时也用它 */
    alt: string;
    /** 覆盖规格里的宽高比，少数位置需要特殊裁剪时才传 */
    ratio?: string;
    /** md 完整说明（大图位）｜ sm 只留文件名与尺寸（小卡片）｜ icon 只画图标（方形小位置） */
    size?: "sm" | "md" | "icon";
  }>(),
  { ratio: "", size: "md" },
);

const url = computed(() => imageUrl(props.slot));
const spec = computed(() => specOf(props.slot));
const ratio = computed(() => props.ratio || spec.value.ratio);
const fileName = computed(() => `${props.slot}.png`);
</script>

<template>
  <div
    class="slot"
    :class="[`is-${size}`, { 'is-fill': ratio === 'auto' }]"
    :style="ratio === 'auto' ? undefined : { aspectRatio: ratio }"
  >
    <img v-if="url" class="img" :src="url" :alt="alt" loading="lazy" decoding="async" />

    <div v-else class="ph" role="img" :aria-label="`${alt}${t('（图片待补）')}`">
      <BlueprintGrid variant="dot" :size="20" :fade="false" />

      <div class="ph-body">
        <svg v-if="size !== 'sm'" class="ph-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="15" rx="2" />
          <circle cx="8.6" cy="9.8" r="1.5" />
          <path d="M3.8 16.8 9.4 11.6l3.8 3.4 2.6-2.3 4.4 4.1" />
        </svg>

        <p v-if="size === 'md'" class="ph-tag">IMAGE SLOT</p>
        <p v-if="size !== 'icon'" class="ph-file">{{ fileName }}</p>

        <p v-if="size !== 'icon' && spec.px" class="ph-px">
          <span class="ph-line"></span>
          <span class="ph-px-text">{{ spec.px }}</span>
          <span class="ph-line"></span>
        </p>

        <p v-if="size === 'md' && spec.content" class="ph-hint">{{ spec.content }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slot {
  position: relative;
  width: 100%;
  overflow: hidden;
}

/* fill 模式：整屏背景位（ratio: auto），不撑宽高比，靠父容器决定形状 */
.slot.is-fill {
  width: 100%;
  height: 100%;
}

.img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── 占位框 ── */
.ph {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--color-bg-subtle);
  border: 1px dashed var(--color-line-strong);
  border-radius: inherit;
}

.ph-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  max-width: 440px;
  text-align: center;
}

.ph-icon {
  width: 28px;
  height: 28px;
  margin-bottom: var(--space-1);
  fill: none;
  stroke: var(--color-ink-tertiary);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ph-tag {
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-wide);
  color: var(--color-accent);
}

.ph-file {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-ink);
  word-break: break-all;
}

/* 尺寸标注线：细线两端带端刻度，中间写尺寸 —— 工程图纸的做法 */
.ph-px {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 220px;
  max-width: 100%;
}

.ph-line {
  position: relative;
  flex: 1;
  height: 1px;
  background: var(--color-line-strong);
}

.ph-line::before,
.ph-line::after {
  content: "";
  position: absolute;
  top: -3px;
  width: 1px;
  height: 7px;
  background: var(--color-line-strong);
}

.ph-line::before {
  left: 0;
}

.ph-line::after {
  right: 0;
}

.ph-px-text {
  flex: none;
  font-size: var(--font-size-xs);
  color: var(--color-ink-tertiary);
  white-space: nowrap;
}

.ph-hint {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  line-height: var(--font-line-height-snug);
  color: var(--color-ink-tertiary);
}

/* 紧凑模式：小卡片里只留必要信息，别把卡片塞满字 */
.is-sm .ph {
  padding: var(--space-3);
}

.is-sm .ph-file {
  font-size: var(--font-size-xs);
}

.is-sm .ph-px {
  width: 130px;
}

/* 图标位（48px 方块）：只画一个图形标，放不下任何文字就不放 */
.is-icon .ph {
  padding: 0;
}

.is-icon .ph-icon {
  width: 20px;
  height: 20px;
  margin: 0;
}

.is-icon .ph-body {
  gap: 0;
  max-width: none;
}

/* fill 模式（整屏背景位）：说明退到右下角、只留文件名和尺寸。
   居中会和压在背景上的正文直接打架，而且背景位本来就不该抢眼 ——
   它只要让人知道「这儿是一张整屏图，还没放」就够了。 */
.is-fill .ph {
  align-items: flex-end;
  justify-content: flex-end;
  padding: var(--space-6) var(--space-7) var(--space-7) var(--space-6);
}

.is-fill .ph-body {
  align-items: flex-end;
  gap: 3px;
  max-width: 300px;
  text-align: right;
}

.is-fill .ph-icon,
.is-fill .ph-tag,
.is-fill .ph-hint {
  display: none;
}

@media (max-width: 768px) {
  .ph-hint {
    display: none;
  }
}
</style>

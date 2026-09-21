<script setup lang="ts">
/**
 * 技术体系架构图 —— 工程制图风格，替代真实产品截图。
 *
 * 为什么是「图纸」而不是「炫光插图」：
 * 大厂官网的信任感来自「可被检验的结构」，而不是氛围。所以我们画结构：
 * 节点、连线、刻度、标注。线条用 pathLength 归一化做逐笔生长，
 * 是整站唯一保留的「非必要」动效，克制且只在进入视口时跑一次。
 *
 * 三套图：
 *   hec  网状拓扑（中心授权 + 外围系统）
 *   uef  分层栈（四层执行架构）
 *   cep  集群汇聚（数据节点 → 云平台）
 *
 * 为什么自己管进入视口的判定，而不是复用 v-reveal：
 *   动画要作用在 SVG 内部的图元上，触发类却挂在根节点上，属于「跨元素」选择器。
 *   在 scoped 样式里写 :global(.reveal-visible) .draw，会被 Vue 的 scoped 编译器
 *   编译成只剩 .reveal-visible（后代部分被丢掉），规则静默失效 ——
 *   线条永远停在 stroke-dashoffset: 1，节点永远 opacity: 0，页面看着像图没画完。
 *   自己持有状态类（is-drawn）就没有这个坑：触发与作用对象都在本组件内。
 */
import { onMounted, onUnmounted, ref } from "vue";
import { whenDue } from "../directives/reveal";
import { t } from "../i18n";

withDefaults(defineProps<{ kind: "hec" | "uef" | "cep" }>(), { kind: "hec" });

const root = ref<HTMLElement | null>(null);
const drawn = ref(false);
let stopWatch: (() => void) | null = null;

onMounted(() => {
  const el = root.value;
  if (!el) return;
  /* 判定逻辑和 v-reveal 共用一份：进视口或者已经被滚过去，都给终态 */
  stopWatch = whenDue(el, () => {
    drawn.value = true;
    stopWatch?.();
  });
});

onUnmounted(() => stopWatch?.());
</script>

<template>
  <div ref="root" class="diagram" :class="{ 'is-drawn': drawn }" aria-hidden="true">
    <!-- ═══ HEC · 全域互联拓扑 ═══ -->
    <svg v-if="kind === 'hec'" viewBox="0 0 480 300" class="svg">
      <!-- 四角断线取景框 -->
      <path class="frame" d="M0 16 V0 H16" />
      <path class="frame" d="M464 0 H480 V16" />
      <path class="frame" d="M480 284 V300 H464" />
      <path class="frame" d="M16 300 H0 V284" />

      <!-- 顶部刻度尺 -->
      <g class="ticks">
        <line v-for="i in 15" :key="`tx${i}`" :x1="40 + (i - 1) * 28" :y1="0" :x2="40 + (i - 1) * 28" :y2="i % 5 === 0 ? 8 : 4" />
      </g>
      <g class="ticks">
        <line v-for="i in 9" :key="`ty${i}`" :x1="0" :y1="40 + (i - 1) * 28" :x2="i % 5 === 0 ? 8 : 4" :y2="40 + (i - 1) * 28" />
      </g>

      <!-- 中心授权节点 -->
      <circle class="hub" cx="240" cy="150" r="38" />
      <circle class="hub-ring" cx="240" cy="150" r="50" />
      <text class="code" x="240" y="145">HEC</text>
      <text class="code-sub" x="240" y="163">{{ t("统一授权") }}</text>

      <!-- 六条辐射线 -->
      <line
        v-for="(n, i) in [
          { x: 240, y: 46 },
          { x: 358, y: 98 },
          { x: 358, y: 202 },
          { x: 240, y: 254 },
          { x: 122, y: 202 },
          { x: 122, y: 98 },
        ]"
        :key="`wire${i}`"
        class="wire draw"
        :style="{ '--d': `${i * 90}ms` }"
        pathLength="1"
        x1="240"
        y1="150"
        :x2="n.x"
        :y2="n.y"
      />

      <!-- 六个外围节点 -->
      <g v-for="(n, i) in [
        { x: 240, y: 46, label: '信任中心' },
        { x: 358, y: 98, label: 'IDE' },
        { x: 358, y: 202, label: 'WeAuth' },
        { x: 240, y: 254, label: '云服务' },
        { x: 122, y: 202, label: '数据库' },
        { x: 122, y: 98, label: '存储' },
      ]" :key="`node${i}`" class="leaf draw-fade" :style="{ '--d': `${300 + i * 80}ms` }">
        <circle class="node" :cx="n.x" :cy="n.y" r="24" />
        <text class="label" :x="n.x" :y="n.y + 4">{{ t(n.label) }}</text>
      </g>

      <!-- 标注引线 -->
      <g class="annot">
        <line x1="290" y1="150" x2="380" y2="150" />
        <line x1="380" y1="150" x2="400" y2="136" />
        <circle cx="290" cy="150" r="2.5" />
        <text class="note" x="404" y="132">SSO / OAuth</text>
        <text class="note" x="404" y="146">{{ t("一次认证") }}</text>
      </g>
    </svg>

    <!-- ═══ UEF · 分层执行栈 ═══ -->
    <svg v-else-if="kind === 'uef'" viewBox="0 0 480 300" class="svg">
      <path class="frame" d="M0 16 V0 H16" />
      <path class="frame" d="M464 0 H480 V16" />
      <path class="frame" d="M480 284 V300 H464" />
      <path class="frame" d="M16 300 H0 V284" />

      <!-- 左侧层级轴 -->
      <line class="axis" x1="48" y1="34" x2="48" y2="266" />
      <g class="ticks">
        <line v-for="i in 5" :key="`l${i}`" x1="42" :y1="34 + (i - 1) * 58" x2="54" :y2="34 + (i - 1) * 58" />
      </g>
      <text class="note" x="34" y="30" text-anchor="end">L4</text>
      <text class="note" x="34" y="88" text-anchor="end">L3</text>
      <text class="note" x="34" y="146" text-anchor="end">L2</text>
      <text class="note" x="34" y="204" text-anchor="end">L1</text>
      <text class="note" x="34" y="262" text-anchor="end">L0</text>

      <!-- 四层 + 底层 -->
      <g
        v-for="(layer, i) in [
          { y: 34, label: '交互层', s: 'Web / 移动端 / 开放 API' },
          { y: 92, label: '编排层', s: '能力注册 · 流程编排 · 灰度' },
          { y: 150, label: '运行时层', s: '编译 / 调试 / 部署 / 协作' },
          { y: 208, label: '治理层', s: '策略 · 审计 · 默认安全' },
        ]"
        :key="`layer${i}`"
        class="draw-fade"
        :style="{ '--d': `${i * 110}ms` }"
      >
        <rect class="layer-box" x="72" :y="layer.y" width="330" height="44" rx="6" />
        <text class="layer-title" x="90" :y="layer.y + 20">{{ t(layer.label) }}</text>
        <text class="layer-sub" x="90" :y="layer.y + 36">{{ t(layer.s) }}</text>
        <circle class="tie" cx="416" :cy="layer.y + 22" r="3" />
        <line class="wire" x1="402" :y1="layer.y + 22" x2="413" :y2="layer.y + 22" />
      </g>

      <!-- 层间竖向贯通线 -->
      <line class="wire draw" pathLength="1" style="--d: 480ms" x1="240" y1="78" x2="240" y2="92" />
      <line class="wire draw" pathLength="1" style="--d: 560ms" x1="240" y1="136" x2="240" y2="150" />
      <line class="wire draw" pathLength="1" style="--d: 640ms" x1="240" y1="194" x2="240" y2="208" />

      <!-- text-anchor="end" + 贴右边界收口：原来写 x="428" 且默认 start，
           10px 字 × 2.2 倍缩放后宽约 190px，右端溢出画布 69px 被裁成「AI Engine · R」。
           靠 end 锚点在画布内收口，改文案也不会再溢出。 -->
      <text class="note" x="472" y="266" text-anchor="end">AI Engine · RAG</text>
    </svg>

    <!-- ═══ CEP · 集群汇聚 ═══ -->
    <svg v-else viewBox="0 0 480 300" class="svg">
      <path class="frame" d="M0 16 V0 H16" />
      <path class="frame" d="M464 0 H480 V16" />
      <path class="frame" d="M480 284 V300 H464" />
      <path class="frame" d="M16 300 H0 V284" />

      <!-- 左侧数据节点集群（虚线框） -->
      <rect class="cluster" x="30" y="60" width="120" height="180" rx="8" />
      <text class="note" x="42" y="52">DATA CLUSTER</text>

      <g v-for="(n, i) in [
        { y: 82, label: 'MySQL' },
        { y: 140, label: 'PostgreSQL' },
        { y: 198, label: 'S3 对象' },
      ]" :key="`d${i}`" class="draw-fade" :style="{ '--d': `${i * 120}ms` }">
        <rect class="node-box" x="46" :y="n.y - 18" width="88" height="36" rx="5" />
        <text class="label" x="90" :y="n.y + 4">{{ t(n.label) }}</text>
      </g>

      <!-- 汇聚连线 -->
      <path
        v-for="(y, i) in [82, 140, 198]"
        :key="`m${i}`"
        class="wire draw"
        :style="{ '--d': `${380 + i * 90}ms` }"
        pathLength="1"
        :d="`M150 ${y} C 190 ${y}, 200 150, 240 150`"
      />

      <!-- 中间云平台 -->
      <rect class="hub-box" x="240" y="112" width="120" height="76" rx="10" />
      <text class="code inverse" x="300" y="144">CEP</text>
      <text class="code-sub inverse" x="300" y="162">{{ t("云能力平台") }}</text>

      <!-- 输出到验证节点 -->
      <line class="wire draw" pathLength="1" style="--d: 700ms" x1="360" y1="150" x2="410" y2="150" />
      <g class="draw-fade" style="--d: 820ms">
        <rect class="node-box accent-box" x="410" y="128" width="58" height="44" rx="6" />
        <text class="label accent-label" x="439" y="146">WeAuth</text>
        <text class="note" x="439" y="160">PoW</text>
      </g>

      <!-- 底部指标刻度 -->
      <g class="ticks">
        <line v-for="i in 19" :key="`b${i}`" :x1="30 + (i - 1) * 23" y1="290" :x2="30 + (i - 1) * 23" :y2="i % 5 === 0 ? 282 : 286" />
      </g>
      <text class="note" x="30" y="278">99.99% AVAILABILITY</text>
    </svg>
  </div>
</template>

<style scoped>
.diagram {
  width: 100%;
}

.svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

/* ── 基础图元 ── */
.frame,
.axis {
  fill: none;
  stroke: var(--color-line-strong);
  stroke-width: 1;
}

.ticks line {
  stroke: var(--color-line-strong);
  stroke-width: 1;
}

.wire {
  stroke: var(--color-line-strong);
  stroke-width: 1;
  fill: none;
}

.cluster {
  fill: none;
  stroke: var(--color-line);
  stroke-dasharray: 5 4;
}

/* ── 节点 ── */
.hub {
  fill: var(--color-accent-soft);
  stroke: var(--color-accent);
  stroke-width: 1.5;
}

.hub-ring {
  fill: none;
  stroke: var(--color-line-strong);
  stroke-width: 1;
  stroke-dasharray: 3 5;
}

.node {
  fill: var(--color-bg);
  stroke: var(--color-line-strong);
  stroke-width: 1;
}

.node-box,
.layer-box {
  fill: var(--color-bg);
  stroke: var(--color-line-strong);
  stroke-width: 1;
}

.hub-box {
  fill: var(--color-bg-ink);
  stroke: var(--color-bg-ink);
}

.accent-box {
  fill: var(--color-accent-soft);
  stroke: var(--color-accent);
}

.tie {
  fill: var(--color-line-strong);
}

/* ── 文字 ── */
.code {
  fill: var(--color-accent);
  font-size: 15px;
  font-weight: 700;
  text-anchor: middle;
  letter-spacing: 0.04em;
}

.code-sub {
  fill: var(--color-ink-secondary);
  font-size: 11px;
  text-anchor: middle;
}

.label {
  fill: var(--color-ink);
  font-size: 11px;
  font-weight: 500;
  text-anchor: middle;
}

.accent-label {
  fill: var(--color-accent);
  font-weight: 600;
}

.layer-title {
  fill: var(--color-ink);
  font-size: 12px;
  font-weight: 600;
}

/* 注释与小字一律走 ink-secondary（#4E5969）而不是 ink-tertiary（#6B7280）。
   图纸上的字本身就是「要被读的东西」，不是装饰 —— 用户看过一版后明确「不要白色/浅色，
   用黑色」。图纸放到 1272px 宽时这些字在屏幕上是 26px，颜色再浅就白瞎了字号。 */
.layer-sub {
  fill: var(--color-ink-secondary);
  font-size: 10px;
}

.note {
  fill: var(--color-ink-secondary);
  font-size: 10px;
  letter-spacing: 0.06em;
}

.annot line {
  stroke: var(--color-line-strong);
  stroke-width: 1;
}

.annot circle {
  fill: var(--color-bg);
  stroke: var(--color-ink-tertiary);
  stroke-width: 1;
}

/* ── 逐笔绘制 ── */
.draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

.draw-fade {
  opacity: 0;
}

.is-drawn .draw {
  stroke-dashoffset: 0;
  /* 用长写而不是 transition 简写：简写里带 var() 缓动函数时，
     构建期的 CSS 压缩会把 transition-property / duration 压成空值，动画直接失效。 */
  transition-property: stroke-dashoffset;
  transition-duration: 900ms;
  transition-timing-function: var(--motion-ease-out);
  transition-delay: var(--d, 0ms);
}

.is-drawn .draw-fade {
  opacity: 1;
  transition-property: opacity;
  transition-duration: 520ms;
  transition-timing-function: var(--motion-ease-out);
  transition-delay: var(--d, 0ms);
}

.is-drawn .annot {
  opacity: 1;
  transition-property: opacity;
  transition-duration: 520ms;
  transition-timing-function: var(--motion-ease-out);
  transition-delay: 900ms;
}

.annot {
  opacity: 0;
}
/* 深色块上的文字反白 */
.inverse {
  fill: var(--color-ink-inverse);
}

@media (prefers-reduced-motion: reduce) {
  .draw {
    stroke-dashoffset: 0;
  }
  .draw-fade,
  .annot {
    opacity: 1;
  }
}
</style>

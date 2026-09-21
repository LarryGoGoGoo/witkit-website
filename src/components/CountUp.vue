<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    value: string;
    duration?: number;
  }>(),
  {
    duration: 1500,
  },
);

const display = ref("0");
const el = ref<HTMLElement | null>(null);
let raf = 0;
let started = false;

function parseValue(val: string): {
  prefix: string;
  num: number;
  suffix: string;
} {
  const match = val.match(/^([^\d.-]*)([\d.]+)(.*)$/);
  if (!match) return { prefix: "", num: 0, suffix: val };
  return {
    prefix: match[1],
    num: Number.parseFloat(match[2]),
    suffix: match[3],
  };
}

function animate() {
  if (!el.value) return;
  const { prefix, num, suffix } = parseValue(props.value);
  const start = performance.now();
  const duration = props.duration;

  function tick(now: number) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - t) ** 3;
    const current = num * eased;

    // 整数显示整数，小数保留原位数
    const decimals = (props.value.match(/\.(\d+)/)?.[1] ?? "").length;
    display.value = `${prefix}${current.toFixed(decimals)}${suffix}`;

    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      display.value = props.value;
    }
  }

  raf = requestAnimationFrame(tick);
}

function onIntersect(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    if (entry.isIntersecting && !started) {
      started = true;
      animate();
    }
  }
}

let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(onIntersect, { threshold: 0.5 });
  if (el.value) observer.observe(el.value);
});

onUnmounted(() => {
  if (observer) observer.disconnect();
  cancelAnimationFrame(raf);
});

// 值变化时重新动画
watch(
  () => props.value,
  () => {
    started = false;
    display.value = "0";
    if (observer && el.value) {
      observer.disconnect();
      observer = new IntersectionObserver(onIntersect, { threshold: 0.5 });
      observer.observe(el.value);
    }
  },
);
</script>

<template>
  <span ref="el">{{ display }}</span>
</template>

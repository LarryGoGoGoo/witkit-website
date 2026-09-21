import type { Directive } from "vue";

/**
 * 「什么时候算该显示了」只写一次，两个地方共用：
 *   · v-reveal 指令 —— 普通 HTML 元素
 *   · TechDiagram —— 需要拿到状态自己挂类（要作用在 SVG 图元上，不能靠后代选择器跨元素）
 *
 * 为什么不能只用 IntersectionObserver：
 *   观察器只在「相交状态发生变化」时回调。用户一次跳转（点锚点、浏览器恢复滚动位置、
 *   一把滚过好几屏）会让元素直接从「下方未相交」变成「上方未相交」，
 *   整个过程中 isIntersecting 一直是 false，回调根本不会触发 ——
 *   元素就永久停在 opacity: 0 上。所以补一个滚动兜底：被越过的元素立刻给终态。
 */

/** 提前量：元素还差 80px 露头就起动画，滚到眼前时已经动完了，不会看到「空一下」 */
const MARGIN = 80;

interface Watcher {
  el: HTMLElement;
  cb: () => void;
}

const watchers = new Map<HTMLElement, Watcher>();
let rafId = 0;
let listening = false;

function isDue(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  /* 两个条件都算「该显示了」：
     1. 已进入视口（留 MARGIN 余量）
     2. 已经在视口上方 —— 说明是跳过来的，必须直接给终态，不能再等下一次相交 */
  return r.top < window.innerHeight - MARGIN || r.bottom <= 0;
}

function settle(el: HTMLElement) {
  const w = watchers.get(el);
  if (!w) return;
  watchers.delete(el);
  observer?.unobserve(el);
  w.cb();
  if (!watchers.size) stopListening();
}

function flush() {
  rafId = 0;
  for (const el of [...watchers.keys()]) if (isDue(el)) settle(el);
}

function onScroll() {
  /* 滚动里做 rAF 节流：每帧最多算一次，且只在还有待判定元素时监听 */
  if (rafId) return;
  rafId = requestAnimationFrame(flush);
}

function startListening() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

function stopListening() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

/* threshold 用 0：比视口还高的元素永远凑不满百分比阈值，用 0 只要求「进来了」 */
const observer =
  typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) settle(entry.target as HTMLElement);
          }
        },
        { threshold: 0, rootMargin: `0px 0px -${MARGIN}px 0px` },
      );

/** 元素「该显示了」时回调一次，之后自动解绑。返回手动解绑函数。 */
export function whenDue(el: HTMLElement, cb: () => void): () => void {
  watchers.set(el, { el, cb });
  observer?.observe(el);
  startListening();
  /* 挂载时元素可能已经在视口里、甚至已经被滚过去了，先排一帧兜底判定 */
  if (!rafId) rafId = requestAnimationFrame(flush);

  return () => {
    watchers.delete(el);
    observer?.unobserve(el);
    if (!watchers.size) stopListening();
  };
}

/** 滚动渐入指令：v-reveal（可选延迟用参数传，如 v-reveal="100"） */
export const vReveal: Directive<HTMLElement> = {
  mounted(el, binding) {
    el.classList.add("reveal-hidden");
    if (binding.arg) el.dataset.revealDelay = binding.arg;

    whenDue(el, () => {
      el.style.transitionDelay = `${el.dataset.revealDelay ?? "0"}ms`;
      el.classList.add("reveal-visible");
    });
  },
  unmounted(el) {
    watchers.delete(el);
    observer?.unobserve(el);
    if (!watchers.size) stopListening();
  },
};

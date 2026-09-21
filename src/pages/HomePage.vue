<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import ImageSlot from "../components/ImageSlot.vue";
import { t } from "../i18n";

/* ═══ 页面文案 ═══
   原则：像大厂「关于我们」那样说话 —— 讲人话，讲做什么，不讲技术名词。
   不出现 HEC / UEF / CEP 这类代号，不出现"底座""架构""引擎"这类词，
   也不出现任何具体产品或服务的介绍、名称与链接（「产品入口」那一行已按用户要求删除）。
   也没有「概览」这类业务架构清单，也没有「管理团队」与联系表单（用户要求全删）。

   文案一律走 t()，中文原文就是 key —— 所以模板里到处是 t("…") 是正常的，
   不是啰嗦：这样切到繁中/英文时这一页整页跟着换，而不只是顶栏换。 */

/* ═══ 企业文化：一整页背景，一条一条翻 ═══
   结构照字节关于页的「企业文化」：一条讲清楚「什么、怎么落到日常」。
   版式是这一页独有的 —— 不再是「左边一张图 + 右边一块蓝色面板」，
   而是整页都是背景（图铺满 + 品牌蓝压暗），正文压在背景上。
   **只有这一页是「图片上有字」**，公司简介 / 愿景及使命是图与字分开摆的（用户明确要求）。

   四条内容（用户定的）：开放 · 包容 · 真诚 · 热爱。
   points 是「怎么做」的三条 —— 光有口号没有做法，文化就成了墙上的字。
   翻页只换字，正文位置固定不动（用户要求「字位置别变，就固定在一个大概位置」）。 */
const VALUES = [
  {
    slug: "open",
    name: "开放",
    line: "把话摊在桌面上说。判断只看事实，不看是谁说的。",
    points: [
      "信息默认共享，不以掌握信息作为筹码",
      "不同意见当场提出，不在会后另找人说",
      "外部反馈与内部判断冲突时，先查事实，再下结论",
    ],
  },
  {
    slug: "inclusive",
    name: "包容",
    line: "承认人和人不一样，也承认自己的判断只是其中一种。",
    points: [
      "用不一样的办法把事做成，同样算做成",
      "不要求所有人用同一种方式表达和协作",
      "判断可以修正，不因一次失误给人定性",
    ],
  },
  {
    slug: "sincere",
    name: "真诚",
    line: "对外说的和对内说的，是同一套话。",
    points: [
      "产品做不到的，不写进宣传；说得含糊等同于说谎",
      "承诺的时间给不出，提前说明，不拖到最后一天",
      "不以「行业惯例」为由，省去那句该说的话",
    ],
  },
  {
    slug: "passion",
    name: "热爱",
    line: "自己做的东西自己先用。不好用的地方，自己先难堪。",
    points: [
      "自己产品的第一批用户，是自己",
      "打磨的时间不省，因为成品自己要天天用",
      "可以慢，不能糊弄 —— 糊弄出来的东西，最后都回到自己手上",
    ],
  },
];

const activeValue = ref(0);
const currentValue = computed(() => VALUES[activeValue.value] ?? VALUES[0]);

function stepValue(delta: number) {
  const n = VALUES.length;
  activeValue.value = (activeValue.value + delta + n) % n;
  restartAutoPlay();
}

/* ═══ 自动轮播 ═══
   四条企业文化约 3.5 秒自动切一条，循环；用户手动点箭头后重新计时。
   组件卸载时清定时器，避免离开页面还空转。 */
let autoTimer: number | undefined;

function stopAutoPlay() {
  if (autoTimer !== undefined) {
    window.clearInterval(autoTimer);
    autoTimer = undefined;
  }
}

function restartAutoPlay() {
  stopAutoPlay();
  autoTimer = window.setInterval(() => {
    activeValue.value = (activeValue.value + 1) % VALUES.length;
  }, 3500);
}

/* ═══ 首次进入的滚动叙事 ═══
   用户要的效果：第一次打开网站，企业文化这一页定格在第 1 条，不自动轮播；
   往下滚一下切到第 2 条，再滚到 3、4，滚过第 4 条之后才继续往下翻页。
   看完这一次之后（含从「我们的服务」点「关于我们」跳回来、以及刷新页面），
   文化区回到现在的自然滚动（3.5 秒自动轮播）。

   实现：首次进入时把这一页撑成 (条目数 + 1) 屏高，内层吸顶占一屏；
   随页面滚动算出当前应显示第几条。滚过最后一屏即视为「看过」，
   记录到 sessionStorage，并把页面恢复成单屏 + 自动轮播。
   用 sessionStorage 而不是 localStorage：关掉标签页重开，才会重新看一遍。 */
const NARRATIVE_KEY = "witkit-culture-narrative-done";

function narrativeDone(): boolean {
  try {
    return sessionStorage.getItem(NARRATIVE_KEY) === "1";
  } catch {
    return false;
  }
}

const narrativeActive = ref(!narrativeDone());
const cultureSection = ref<HTMLElement | null>(null);

let scrollFrame = 0;

function onScroll() {
  if (!narrativeActive.value) return;
  if (scrollFrame) return;

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    if (!narrativeActive.value) return;
    const el = cultureSection.value;
    if (!el) return;

    const vh = window.innerHeight;
    /* 叙事模式下外层高 (条目数+1)vh，内层吸顶 100vh，可滚动区间 = 条目数 * vh */
    const total = el.offsetHeight - vh;
    if (total <= 0) return;

    const rect = el.getBoundingClientRect();
    const progress = Math.min(Math.max(-rect.top / total, 0), 1);
    activeValue.value = Math.min(
      Math.floor(progress * VALUES.length),
      VALUES.length - 1,
    );

    /* 完全滚过 → 看过一遍，恢复自然滚动 */
    if (rect.top <= -total) finishNarrative();
  });
}

function finishNarrative() {
  const el = cultureSection.value;
  const vh = window.innerHeight;
  const savedY = window.scrollY;
  const total = el ? el.offsetHeight - vh : 0;

  try {
    sessionStorage.setItem(NARRATIVE_KEY, "1");
  } catch {
    /* 隐私模式写入会抛，忽略 */
  }

  narrativeActive.value = false;
  window.removeEventListener("scroll", onScroll);

  /* 外层从 (条目数+1)vh 缩回 100vh，少了 total 高度；把滚动位置同步回退，
     让视口里正在看的内容原地不动，不出现跳动 */
  window.requestAnimationFrame(() => {
    if (total > 0) window.scrollTo(0, Math.max(savedY - total, 0));
  });

  restartAutoPlay();
}

onMounted(() => {
  if (narrativeActive.value) {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  } else {
    restartAutoPlay();
  }
});

onBeforeUnmount(() => {
  stopAutoPlay();
  window.removeEventListener("scroll", onScroll);
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
});

/* ═══ 行为准则 ═══
   字节关于页有一块「行为准则」：讲清楚底线在哪，再给一个「了解更多」。
   这里照这个思路写四条 —— 都是能被检验的行为，不是形容词。

   口径（用户要求「像大厂能说出来的话」，并特别要求「有底气」）：
   标题是判断句，正文用书面语、一句一条、只陈述标准不做解释。
   ❌ 不出现「先问」「便宜得多」「最省事的一条路」这类口语，
   ❌ 也不要「我们产品不多，但…」这种先自我辩护再解释的口气 —— 那是没底气的写法。
   四条顺序是「对用户 → 对市场 → 对同行 → 对自己」，由外到内收口。 */
const CONDUCT = [
  {
    title: "数据有边界",
    desc: "用户交出的数据，只用于其知情并同意的那个目的。换一个用途，就重新取得一次授权。",
  },
  {
    title: "承诺即契约",
    desc: "对外公布的每一项能力，产品里都真实可用。尚未做到的，不写进介绍，也不提前许诺。",
  },
  {
    title: "产品定胜负",
    desc: "以产品的质量和服务的体验赢得用户。不诋毁同行，不以低于成本的价格换取份额。",
  },
  {
    title: "错误不遮掩",
    desc: "问题在发现的第一时间同步，不为短期体面压着不说。暴露得越早，代价越小。",
  },
];

/* ═══ 联系我们 ═══
   唯一联系邮箱 zhouzihong@qifalab.cn（用户定的，2026-09-20）。
   邮箱写成 mailto，点一下直接开写。
   （页面上不再放联系表单 —— 静态站没有后端收表，摆了也只是装样子。） */
const contactEmail = "zhouzihong@qifalab.cn";

/* ═══ 首屏动画 ═══
   光影殿堂（用户 2026-09-20 定稿，F4 方案）：深黑底 + 居中两行。
   光影走「殿堂」路线：中央光晕托字、两处不对称光斑、底部波纹、边缘漏光、暗角。
   白字 + 冷蓝光晕（text-shadow 三层），不做受光渐变、不做色差重影、不堆流光。 */
const wordIn = ref(false);

const heroTimers: number[] = [];
function heroTimer(fn: () => void, ms: number) {
  heroTimers.push(window.setTimeout(fn, ms));
}

onMounted(() => {
  /* 光先亮，字后浮出 —— 顺序不能反，光在前才显得字是「被打亮」的 */
  heroTimer(() => {
    wordIn.value = true;
  }, 260);
});

onBeforeUnmount(() => {
  for (const t of heroTimers) window.clearTimeout(t);
});
</script>

<template>
  <div class="page">
    <!-- ═══ 首屏：光影殿堂 ═══
         用户 2026-09-20 定稿（F4 方案）：居中两行，上行「妙计科技」、下行主张。
         忠实还原 F4 视觉：中央光晕托字 + 两处不对称光斑 + 底部波纹 + 边缘漏光 + 暗角，
         白字三层冷蓝光晕。有意去掉 F4 图里的红蓝色差重影和 HUD 角标（与官网调性冲突）。 -->
    <section class="hero" :class="{ 'is-in': wordIn }">
      <!-- 光环境层：中央光晕 + 两处不对称光斑 + 底部波纹 + 边缘漏光 -->
      <div class="hero-light" aria-hidden="true">
        <div class="hero-halo"></div>
        <div class="hero-orb hero-orb--a"></div>
        <div class="hero-orb hero-orb--b"></div>
        <svg class="hero-waves" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 620 Q360 560 720 610 T1440 600" />
          <path d="M0 660 Q360 600 720 650 T1440 640" />
          <path d="M0 700 Q360 640 720 690 T1440 680" />
          <path d="M0 740 Q360 680 720 730 T1440 700" />
        </svg>
        <div class="hero-edge"></div>
      </div>

      <!-- 暗角：四周压暗，把视线收向中心 -->
      <div class="hero-vignette" aria-hidden="true"></div>

      <div class="hero-inner">
        <p class="hero-brand">{{ t("妙计科技") }}</p>
        <h1 class="hero-title">{{ t("以科技聚力改变未来") }}</h1>
        <p class="hero-en">TECHNOLOGY · UNITES · THE FUTURE</p>
      </div>

      <!-- 全屏颗粒噪点：让纯黑底有胶片质感，不显得死板 -->
      <div class="hero-grain" aria-hidden="true"></div>
    </section>

    <!-- ═══ 公司简介：整屏一页（图与字分开摆，不是「图片上有字」） ═══
         三块「讲公司」的内容各占一整页（用户要求「做成单独的一大页」）。
         这一页整页只有「标题 + 一段话 + 一张配图」——
         曾经底部挂过一行「产品入口」（6 个外链 + 全部产品），用户明确要求删掉。
         关于页从此不含任何产品名与产品链接（产品去顶栏的面板与页脚）。 -->
    <section id="company" class="fp">
      <div class="container-page fp-inner">
        <div class="fp-split">
          <div class="fp-copy" v-reveal>
            <h2 class="fp-title">{{ t("公司简介") }}</h2>
            <p class="fp-lead">
              {{
                t(
                  "妙计科技是一家开发工具公司，产品覆盖开发环境、部署、身份认证与数据管理等基础环节。这些环节的重复建设消耗开发者大量时间，我们将其中的通用能力做成工具：先在自有业务中完整验证，再交付用户使用。公司只在确认长期投入的方向上开设产品线，一经开设，按十年以上周期持续维护。",
                )
              }}
            </p>
          </div>

          <!-- 配图位：about/company · 1600 × 1000 px（8:5） -->
          <ImageSlot
            class="fp-figure"
            v-reveal="80"
            slot="about/company"
            :alt="t('妙计科技的办公环境')"
          />
        </div>
      </div>
    </section>

    <!-- ═══ 愿景及使命：整屏一页（同样图与字分开摆，但这页图左字右） ═══ -->
    <section id="vision" class="fp">
      <div class="container-page fp-inner">
        <div class="fp-split fp-split--rev">
          <div class="fp-copy" v-reveal>
            <h2 class="fp-title">{{ t("愿景及使命") }}</h2>
            <p class="fp-lead">
              {{
                t(
                  "我们的愿景，是让每一个有想法的人都能把想法做成产品。实现路径是持续降低开发工具的门槛：环境、部署、身份、数据等基础环节由工具承担，开发者可以把时间集中在业务本身。这是全部产品线共同的方向，也是我们评估每一项投入的标准。",
                )
              }}
            </p>
          </div>

          <!-- 配图位：about/vision · 1600 × 1000 px（8:5） -->
          <ImageSlot
            class="fp-figure"
            v-reveal="80"
            slot="about/vision"
            :alt="t('妙计科技的团队工作场景')"
          />
        </div>
      </div>
    </section>

    <!-- ═══ 企业文化：整屏一页 + 前后翻页（唯一「图片上有字」的一页） ═══
         首次进入走「滚动叙事」：整页撑成 (条目数+1) 屏，内层吸顶，
         往下滚一次切一条，滚过最后一条才继续往下翻页。
         看过之后（含 SPA 跳回、刷新）回到单屏 + 3.5s 自动轮播。 -->
    <section
      id="culture"
      ref="cultureSection"
      class="fp fp-ink"
      :class="{ 'is-narrative': narrativeActive }"
      :style="narrativeActive ? { height: `${(VALUES.length + 1) * 100}vh` } : undefined"
    >
      <div class="culture-sticky">
        <!-- 配图位：about/value-{slug} · 1200 × 900 px（4:3），整页铺满 -->
        <ImageSlot
          class="fp-bg"
          ratio="auto"
          :slot="`about/value-${currentValue.slug}`"
          :alt="t('{name} 配图', { name: t(currentValue.name) })"
        />
        <div class="fp-scrim" aria-hidden="true"></div>

        <div class="container-page fp-inner">
        <header class="culture-head" v-reveal>
          <h2 class="fp-title fp-title--sm">{{ t("企业文化") }}</h2>
          <p class="fp-lead fp-lead--sm">
            {{ t("文化不是墙上的标语，是判断一件事该不该做时共用的那把尺子。") }}
          </p>
        </header>

        <!-- 正文块位置固定：翻页只换字，不动位置。
             外层 Transition 按 key 切换做淡入淡出，自动/手动翻页都同一套过渡 -->
        <Transition name="culture-fade" mode="out-in">
          <div class="culture-body" :key="activeValue">
            <h3 class="culture-name">{{ t(currentValue.name) }}</h3>
            <p class="culture-line">{{ t(currentValue.line) }}</p>

            <ul class="culture-points">
              <li v-for="p in currentValue.points" :key="p">{{ t(p) }}</li>
            </ul>
          </div>
        </Transition>

        <div class="fp-foot">
          <p class="culture-idx tnum">
            {{ String(activeValue + 1).padStart(2, "0") }} /
            {{ String(VALUES.length).padStart(2, "0") }}
          </p>

          <div class="culture-nav">
            <button
              type="button"
              class="cn-btn"
              :aria-label="t('上一条企业文化')"
              @click="stepValue(-1)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
            <button
              type="button"
              class="cn-btn"
              :aria-label="t('下一条企业文化')"
              @click="stepValue(1)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        </div>
      </div>
    </section>

    <!-- ═══ 行为准则 ═══ -->
    <section id="conduct" class="section section-subtle conduct-sec">
      <span class="conduct-glow" aria-hidden="true"></span>
      <div class="container-page">
        <div class="conduct">
          <div class="conduct-intro">
            <h2 class="section-title">{{ t("行为准则") }}</h2>
            <p class="section-desc">
              {{
                t(
                  "四条底线，对内对外同一把尺。写出来，就是拿来被检验的。",
                )
              }}
            </p>
            <RouterLink to="/#contact" class="link-more">
              {{ t("了解更多") }} <span class="arrow" aria-hidden="true">→</span>
            </RouterLink>
          </div>

          <ol class="conduct-list">
            <li
              v-for="(c, i) in CONDUCT"
              :key="c.title"
              class="conduct-item"
              v-reveal="60 * i"
            >
              <p class="conduct-no tnum">
                {{ String(i + 1).padStart(2, "0") }}
              </p>
              <h3 class="conduct-title">{{ t(c.title) }}</h3>
              <p class="conduct-desc">{{ t(c.desc) }}</p>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- ═══ 联系我们：只留通道，不放表单 ═══ -->
    <section id="contact" class="section section-subtle contact-sec">
      <span class="contact-glow" aria-hidden="true"></span>

      <div class="container-page contact-inner">
        <header class="section-head" v-reveal>
          <h2 class="section-title">{{ t("联系我们") }}</h2>
          <p class="section-desc">
            {{
              t(
                "产品接入、技术合作、业务咨询或媒体采访，写邮件说明来意即可，我们会在 2 个工作日内回复。",
              )
            }}
          </p>
        </header>

        <div class="contact-email" v-reveal>
          <p class="contact-email-label">{{ t("联系邮箱") }}</p>
          <a class="contact-email-value" :href="`mailto:${contactEmail}`">
            {{ contactEmail }}
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ═══ 首屏：光影殿堂 ═══
   忠实还原 F4 方案：深黑底 + 居中两行，中央光晕托字 + 两处不对称光斑 +
   底部波纹 + 边缘漏光 + 暗角。白字 + 三层冷蓝光晕。 */
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 148px 0 var(--space-8);
  overflow: hidden;
  color: var(--color-ink-inverse);
  background: radial-gradient(
    ellipse 70% 62% at 50% 46%,
    var(--color-bg-hero-core) 0%,
    var(--color-bg-hero-mid) 58%,
    var(--color-bg-black) 100%
  );
}

/* 光环境：中央光晕 + 两处不对称光斑 + 底部波纹 + 边缘漏光，独立一层，跟文字分离 */
.hero-light {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* 中央主光晕：字背后的主光。参数逐项照搬 F4 原图（1100×760、blur 18px、居中）——
   这几层光是 F4 的骨相，自己「重新设计」过一次，位置和亮度全跑偏了，不再改。 */
.hero-halo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1100px;
  height: 760px;
  transform: translate(-50%, -50%);
  border-radius: var(--radius-full);
  background: radial-gradient(
    ellipse 50% 46% at 50% 50%,
    color-mix(in oklab, var(--color-accent-bright) 50%, white) 0%,
    color-mix(in oklab, var(--color-accent-bright) 14%, transparent) 40%,
    transparent 70%
  );
  opacity: 0.34;
  filter: blur(18px);
}

/* 两处不对称光斑（位置照搬 F4）：
   ① 右上偏内的一团小亮斑 —— 偏白，是「顶光」；
   ② 左下角的一团大蓝斑 —— 更暗更散，是「地面反光」。
   一上一下、一小一大、一亮一暗，靠这组不对称把对称的版面撑活。 */
.hero-orb {
  position: absolute;
  border-radius: var(--radius-full);
}

/* 右上小亮斑：偏白蓝，blur 小（8px）所以边缘清晰，像一盏具体的灯 */
.hero-orb--a {
  top: 42%;
  left: 60%;
  width: 280px;
  height: 280px;
  background: radial-gradient(
    circle,
    color-mix(in oklab, var(--color-accent-bright) 25%, white) 0%,
    transparent 60%
  );
  opacity: 0.26;
  filter: blur(8px);
}

/* 左下大蓝斑：偏深蓝，blur 大（20px）所以散得开，像地面泛上来的反光 */
.hero-orb--b {
  bottom: -10%;
  left: 20%;
  width: 420px;
  height: 420px;
  background: radial-gradient(
    circle,
    color-mix(in oklab, var(--color-accent-bright) 72%, white) 0%,
    transparent 65%
  );
  opacity: 0.18;
  filter: blur(20px);
}

/* 底部波纹：几条渐淡的水平波浪线，给画面一个「地面」的收口 */
.hero-waves {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-waves path {
  fill: none;
  stroke: color-mix(in oklab, var(--color-accent-bright) 40%, transparent);
}

.hero-waves path:nth-child(1) { stroke-opacity: 0.15; }
.hero-waves path:nth-child(2) { stroke-opacity: 0.10; }
.hero-waves path:nth-child(3) { stroke-opacity: 0.07; }
.hero-waves path:nth-child(4) { stroke-opacity: 0.05; }

/* 边缘漏光：屏幕四周淡淡渗入一道蓝光，像光从殿堂的缝隙透进来 */
.hero-edge {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 150px color-mix(in oklab, var(--color-accent) 25%, transparent);
}

/* 暗角：四周压暗，把视线收向中心的文字（中心点 46%，照搬 F4） */
.hero-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 72% 68% at 50% 46%,
    transparent 48%,
    rgba(0, 0, 0, 0.7) 100%
  );
}

/* 全屏颗粒噪点：SVG fractalNoise，胶片质感，极淡 */
.hero-grain {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0.05;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  background-size: 160px 160px;
}

/* 文字层：居中两行。
   首屏是通栏的，左右不需要常规的 40px 安全边（这行字居中、两侧本就是空的），
   内边距收到 16px 只作防溢出兜底，把宽度全让给字号。
   实测校准：F4 里品牌名中心在 y≈322、主张中心在 y≈465。 */
.hero-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
  width: 100%;
  margin: 0 auto;
  max-width: 1600px;
  padding: 0 16px 90px;
}

/* 上行品牌名：字号跟主张保持 F4 的约 1:3 比例，一起放大。
   line-height 必须显式收成 1.2 —— 不写就继承正文的 1.72，
   在大字号上撑出远超字形的盒子，上下全是虚白，
   两行之间的视觉间距被凭空放大一倍（这是「间距太大」的真正原因）。
   光晕同样补一层近白：F4 里这行有 2.7% 落在 75–92% 档，原来只有一层冷蓝，是 0%。

   字体（用户 2026-09-20「妙计科技的字体用这个」）：
   字体族走 --font-family-brand（雅黑 Regular），**字重必须是 400**。
   注意这次的结论和最初判断相反，绕了一圈才查清：
   问题从来不是「字体族选错了」，而是 font-weight: 600 在 Windows 上把雅黑
   推到了 Bold（雅黑只有 Regular/Bold 两档，500 也落到 Regular）。
   定案依据 —— 让候选字体走**完全相同**的渲染管线（同光晕/字号/字距/背景），
   逐字裁剪归一化后算 Pearson 相关，3 档阈值 × 2 个参考共 6 次测量：
     雅黑 400/500 = 0.958   ← 参考图就是这个
     雅黑 600/700 = 0.785   ← 改动前的状态，就是「不对」的那版
     MiSans 400   = 0.882
     Noto Sans SC = 0.806
   中途曾自托管 Noto Sans SC Medium 子集（以为 Medium 才是目标），
   实测反而更差（0.793），已撤掉 —— 别再加回来。
   教训：用阈值去量「带光晕的位图」不可靠（同段文字阈值 50% 得 0.141、
   阈值 88% 得 0.097，差 45%，换个阈值就换个冠军），必须同管线比对。

   字号按参考反推：参考字高 39px / 墨迹宽 212px。
   原 3.2vw(46px) 偏大（预测墨宽 224px，与实测吻合，比参考宽 12px）。
   2.9vw → 1440 下 41.8px，实测字高 38-39、墨宽 212-214，与参考重合。
   注意 letter-spacing 会加在最后一个字后面，居中时墨迹会左偏半个字距（约 8px），
   所以补 margin-right 负值抵消 —— 参考图里没抵消、墨迹确实偏左 9.5px，那是它的瑕疵。 */
.hero-brand {
  font-family: var(--font-family-brand);
  font-size: clamp(17px, 2.9vw, 43px);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.4em;
  margin-right: -0.4em;
  color: color-mix(in oklab, var(--color-ink-inverse) 78%, transparent);
  text-shadow:
    0 0 10px rgba(210, 232, 255, 0.5),
    0 0 34px color-mix(in oklab, var(--color-accent-bright) 58%, transparent);
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 1000ms var(--motion-ease-out) 120ms,
    transform 1000ms var(--motion-ease-out) 120ms;
}

/* 下行主张：白字 + 五层光晕。
   用户要求「第二行更闪、更大」。曾以为是「层数不够」，其实是**能量分布错了**：
   实测对比 F4 的亮度直方图发现，我原来「白芯 → 直接掉到 30% 冷蓝」，
   字边外侧几乎没有 50–75% 这一档（我 5.7% / F4 19.8%，差 3.5 倍）——
   边缘是硬切的，所以看着是「白字套个圈」而不是「字在发光」。
   另一头，170px/48% 那层远场把字腔（科、技的内白）也糊满了，整体从发光变起雾。

   改法：把能量从远场收回近场 —— 近处补一层 16px 的近白做「渐亮的坡」，
   冷蓝近场加宽提亮，远场收窄减淡，让字腔保持黑。 */

/* 字号上限按「视口宽度」反推，不是按容器（踩过坑）：
   内宽 ≈ 100vw − 32px，9 字每字占 1.05 倍字号 → 字号 ≤ (100vw − 32) / 9.45 ≈ 10.5vw。
   之前写 11vw，1440 下算出 158px、实宽 1493px，溢出 53px。

   2026-09-20 用户「再小一些」：上一轮为「再大一些」把字号推到 10.4vw，
   1440 下实宽 1415px，占视口 97%，两侧只剩 12px —— 顶到边了，所以显得「撑」。
   参考图 F4 是 1082px / 75%（两侧各留 176px）。按参考反推：
   实测墨迹宽 ≈ 字号 × 9.45（含 0.05em 字距），1082 / 9.45 = 114.5px = 7.95vw。
   取 8vw → 1440 下 115px、实宽约 1089px（75.6%），与参考重合。
   上限 118px 对应 1600 以上宽屏（此时实宽约 1115px，富余充足）。 */
.hero-title {
  /* 用户 2026-09-20「位置往下放一些」。
     为什么不是随便推 —— 这一步的受力方向反直觉，实测过才敢写：
     整块文字是 flex 垂直居中的，字号一小 → 块变矮 → **品牌名往下跑、主张往上跑**
     （实测品牌名 +21.8px 到 38.8%，主张 −1.2px 到 51.1%），不是两行一起上移。
     所以「往下放」= 把字号缩小挤出去的位置放回来，靠加两行间距实现。
     换算：间距 +m 时块高 +m → 块顶 −m/2，而主张在块内 +m，
     净效果是**主张下沉 m/2、品牌名上浮 m/2**，不是 1:1。
     间距 16px(space-4) → 48px(space-7)，即 +32px：主张 +16px 到 52.9%、
     品牌名 −16px 到 37.0%。两边同时往参考靠（参考 51.8% / 35.6%），
     不是拆东墙补西墙。 */
  margin-top: var(--space-7);
  font-size: clamp(32px, 8vw, 118px);
  font-weight: 700;
  line-height: var(--font-line-height-tight);
  letter-spacing: 0.05em;
  white-space: nowrap;
  color: #ffffff;
  text-shadow:
    /* ⚠ 光晕半径必须跟着字号走（用户 2026-09-20 缩字号时踩到）：
       这几层是 px 绝对值。字号从 10.4vw 收到 8vw（×0.77）后，同样的
       26/40/88px 相对字就变「散」了 —— 实测半宽 39px vs 参考 26px。
       但**不能等比收**，两个指标在互相拉扯（都实测过）：
         ② 半径 22 → 半宽 26（贴参考 27）但中档 11.5（不到参考六成）
         ② 半径 26 → 中档 12.3（过）但半宽 39（=容差上限）
       因为光晕不是线性叠加，是跳跃式的（半径差 20% 半宽能差 86%）。

       破局的是「9px 那一层」—— 它同时改善两个指标，所以别删：
       看参考图的水平剖面，过渡带里有个 0.63 的中间值
       （0.43 → 0.63 → 1.00），而原来直接从 0.47 跳到 0.96，缺了这一段。
       补上这层小半径中间层后，中档升到 13.2（过），半宽反而收到 23px（过）——
       因为 50% 亮度点被提前了。顺带「晕」档也从 20.7 降到 15.4，
       与参考的 14.9 几乎重合（原先「大而散」变成了和参考一样的「紧凑」）。
       改这几个数之前先跑扫描，别手调。 */
    /* ① 白亮芯：收到最紧，只留一线，避免笔画边界「死白」 */
    0 0 2px rgba(255, 255, 255, 0.92),
    0 0 9px rgba(228, 242, 255, 0.9),
    0 0 22px rgba(222, 239, 255, 1),
    0 0 33px color-mix(in oklab, var(--color-accent-bright) 86%, transparent),
    0 0 74px color-mix(in oklab, var(--color-accent-bright) 58%, transparent),
    0 0 110px color-mix(in oklab, var(--color-accent) 26%, transparent);
  opacity: 0;
  transform: translateY(14px);
  transition:
    opacity 1100ms var(--motion-ease-out),
    transform 1100ms var(--motion-ease-out);
}

/* 英文小标：主张下方的英文说明，字距极大，弱化到几乎只是纹理。
   字号跟着主张一起放大（不然上面字大了、这行还很小，比例失衡），
   行高同样显式收掉，别继承正文的 1.72。 */
.hero-en {
  margin-top: var(--space-5);
  font-size: clamp(13px, 1.05vw, 16px);
  line-height: 1.3;
  font-family: var(--font-family-num);
  letter-spacing: 0.42em;
  color: color-mix(in oklab, var(--color-ink-inverse) 38%, transparent);
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 1000ms var(--motion-ease-out) 300ms,
    transform 1000ms var(--motion-ease-out) 300ms;
}

.hero.is-in .hero-brand,
.hero.is-in .hero-title,
.hero.is-in .hero-en {
  opacity: 1;
  transform: translateY(0);
}

/* 锚点区块被固定顶栏压住的问题：跳转时留出顶栏的高度。
   整屏页（.fp）不在此列 —— 它本来就该顶到视口最上面、由内边距避开顶栏。 */
#conduct,
#contact {
  scroll-margin-top: 96px;
}

/* ═══ 整屏一页 ═══
   公司简介 / 愿景及使命 / 企业文化 各占一整页（用户要求「做成单独的一大页」）。
   三页共用一个骨架，差别只在底色与图文关系：
     · 公司简介 / 愿景及使命 —— 浅底，图与字分开摆（左字右图）
     · 企业文化（.fp-ink）—— 整页都是背景，字压在图上（只有这一页这样） */
.fp {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 148px 0 var(--space-8);
  overflow: hidden;
}

.fp-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  /* 公司简介 / 愿景使命的图文页要「图几乎占满屏幕」：突破默认 1200px 容器，
     拉到宽屏档 1400px，让图列有足够宽度撑起来。 */
  max-width: var(--layout-w-wide);
}

.fp-title {
  font-size: clamp(30px, 3.6vw, var(--font-size-4xl));
  font-weight: 600;
  line-height: var(--font-line-height-tight);
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.fp-title--sm {
  font-size: clamp(26px, 3vw, var(--font-size-3xl));
}

.fp-lead {
  margin-top: var(--space-5);
  max-width: var(--layout-w-prose);
  font-size: clamp(16px, 1.35vw, var(--font-size-lg));
  line-height: var(--font-line-height-relaxed);
  /* 正文段落用主文字黑（用户：公司简介/愿景使命的小字太浅，要黑一点）。
     原来的 ink-secondary 是 #4E5969，跟标题的主黑差一档、读起来发灰。 */
  color: var(--color-ink);
}

.fp-lead--sm {
  margin-top: var(--space-4);
  font-size: clamp(15px, 1.15vw, var(--font-size-base));
}

/* 左字右图：图占几乎整屏，文字窄窄贴边。
   用户要「文字靠两边、图片放大、几乎占满屏幕」——图列给到 1.8fr 的宽度，
   字列压到 0.62fr，同时列间 gap 收小，让图尽量往右顶、文字尽量贴左。 */
.fp-split {
  display: grid;
  grid-template-columns: minmax(0, 0.62fr) minmax(0, 1.8fr);
  gap: var(--space-7);
  align-items: center;
  flex: 1;
}

/* 图左字右：愿景及使命这一页跟公司简介反过来，图放左边、字贴右边。
   方向反转后视觉上错开，两页连着看有节奏，而不是同一版式重复两遍。 */
.fp-split--rev {
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 0.62fr);
}

/* 反转版里图在 DOM 里靠后（视觉在左），文字视觉在右，但 DOM 顺序仍是「字在前、图在后」。
   为了让图真正落到左边，把图这一项反向排到首列。 */
.fp-split--rev .fp-figure {
  order: -1;
}

.fp-figure {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* ═══ 企业文化：整页就是背景，字压在图上面 ═══ */
.fp-ink {
  color: var(--color-ink-inverse);
  /* 底色 = 深墨掺品牌蓝：图没到位时这一页也是「品牌色的一整页」，不是白板；
     图到位后它只是透过 scrim 显出来的一层底。
     掺蓝比例从 18% 降到 10%：整体更亮、更接近深墨而不是蓝黑（用户要求亮一些） */
  background-color: color-mix(
    in oklab,
    var(--color-accent) 10%,
    var(--color-bg-ink)
  );
}

.fp-ink .fp-title,
.fp-ink .fp-lead {
  color: var(--color-ink-inverse);
}

.fp-ink .fp-lead {
  /* 说明句是次要文字，但「次要」不等于「看不清」：往白提亮，
     既比正文弱一档、又不会糊在亮起的背景图上。 */
  color: color-mix(in oklab, var(--color-ink-inverse) 62%, var(--color-ink-inverse-dim));
}

.fp-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* 整页背景位的占位框：不要自己的底色（透出 .fp-ink 的底色）、去圆角 */
.fp-bg :deep(.ph) {
  border: 1px dashed var(--color-line-inverse);
  background: transparent;
  border-radius: 0;
}

/* 占位说明的位置：ImageSlot 的默认是「右下角」，但这一页右下角是翻页按钮，
   两行字会压在按钮上。挪到右侧垂直居中那一块空处（正文在左边，不会撞）。
   选择器带上 .slot 是为了压过 ImageSlot 里 .is-fill .ph 那条（同特异性时谁赢看打包顺序）。 */
.fp-bg :deep(.slot .ph) {
  align-items: center;
  justify-content: flex-end;
  padding-right: var(--space-7);
}

/* 深色页上的占位说明必须反白 —— 否则「IMAGE SLOT / 文件名」在暗底上等于看不见 */
.fp-bg :deep(.ph-file) {
  color: var(--color-ink-inverse);
}

.fp-bg :deep(.ph-px-text),
.fp-bg :deep(.ph-hint) {
  color: var(--color-ink-inverse-dim);
}

.fp-bg :deep(.ph-icon) {
  stroke: var(--color-ink-inverse-dim);
}

.fp-bg :deep(.ph-line),
.fp-bg :deep(.ph-line)::before,
.fp-bg :deep(.ph-line)::after {
  background: var(--color-line-inverse);
}

.fp-bg :deep(.ph-body) {
  opacity: 0.72;
}

/* 点阵底纹也要反白：BlueprintGrid 自带浅色变量（直接写在 .blueprint 上），
   所以这里选择器要带上元素名把特异性顶高一档，否则谁赢取决于样式表的先后。 */
.fp-bg :deep(div.blueprint) {
  --grid-line: color-mix(in oklab, var(--color-line-inverse) 55%, transparent);
  --grid-line-strong: color-mix(
    in oklab,
    var(--color-line-inverse) 75%,
    transparent
  );
  --grid-node: color-mix(in oklab, var(--color-line-inverse) 65%, transparent);
}

/* scrim：整体压一道墨色（顶部和底部更重，中段留给图），
   再从左上一角补一点方向感，让整页背景深浅有层次而不是一块平色。
   用户要求「背景稍微亮一点点、但别发浅」——alpha 只微调，中段略降让图主体透出来，
   但整体仍保住深墨调性，不往浅色/发白方向走。 */
.fp-scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      180deg,
      rgba(7, 12, 24, 0.38) 0%,
      rgba(7, 12, 24, 0.24) 44%,
      rgba(7, 12, 24, 0.50) 100%
    ),
    linear-gradient(118deg, rgba(7, 12, 24, 0.30) 0%, rgba(7, 12, 24, 0.02) 72%);
}

/* ═══ 首次进入的滚动叙事 ═══
   外层撑成 (条目数+1) 屏，内层吸顶占一屏；滚一下切一条，滚过最后一条才继续往下。
   sticky 有个硬约束：任何祖先有 overflow:hidden/scroll 都会把 sticky 钉死，
   所以叙事模式下外层放开 overflow，裁剪改由吸顶容器自己承接。 */
.fp.is-narrative {
  /* padding 收进吸顶容器里，让外层高度精确 = (条目数+1)*100vh，滚动区间好算 */
  padding: 0;
  overflow: visible;
}

.culture-sticky {
  /* 自然滚动模式：就是个普通容器，不干预布局 */
}

.fp.is-narrative .culture-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  /* 接管原来 .fp 的内边距：避开 fixed 顶栏、给底部留一点呼吸 */
  padding: 148px 0 var(--space-8);
  overflow: hidden;
}

/* 顶部的说明段（企业文化页：页名 + 一句话） */
.culture-head {
  max-width: 760px;
}

/* 正文块：位置固定不动（用户要求「字位置别变，就固定在一个大概位置」）。
   上下 auto 把余量平分 —— 四条的正文结构一样（名称 + 一句话 + 三条做法），
   所以翻页时这个落点基本不挪；序号与按钮在下面独立一行，也不会跟着抖。 */
.culture-body {
  max-width: 760px;
  margin: auto 0;
}

/* 翻页过渡：旧内容上移淡出、新内容上移淡入，比纯淡入淡出更顺滑、不断片 */
.culture-fade-enter-active,
.culture-fade-leave-active {
  transition:
    opacity var(--motion-duration-fast) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out);
}

.culture-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.culture-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.culture-name {
  font-size: clamp(28px, 3.2vw, var(--font-size-4xl));
  font-weight: 600;
  line-height: var(--font-line-height-tight);
  letter-spacing: var(--font-letter-spacing-tight);
}

.culture-line {
  margin-top: var(--space-4);
  font-size: clamp(17px, 1.5vw, var(--font-size-xl));
  line-height: var(--font-line-height-snug);
  font-weight: 500;
}

/* 「怎么做」的三条：前导小圆点，不要项目符号的默认样式 */
.culture-points {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding-top: var(--space-5);
  max-width: 620px;
  border-top: 1px solid var(--color-line-inverse);
}

.culture-points li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  font-size: var(--font-size-base);
  line-height: var(--font-line-height-normal);
  /* 三条做法是这一页真正要让人读到的东西，不能太浅：往白提亮一档 */
  color: color-mix(in oklab, var(--color-ink-inverse) 70%, var(--color-ink-inverse-dim));
}

.culture-points li::before {
  content: "";
  flex: none;
  width: 5px;
  height: 5px;
  margin-top: 0.62em;
  border-radius: var(--radius-full);
  background: currentColor;
}

/* 底部一行：左边「第几条 / 共几条」，右边翻页按钮 */
.fp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
}

.culture-idx {
  font-size: var(--font-size-sm);
  color: color-mix(in oklab, var(--color-ink-inverse) 58%, var(--color-ink-inverse-dim));
}

.culture-nav {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.cn-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  border: 1px solid var(--color-line-inverse);
  border-radius: var(--radius-full);
  color: var(--color-ink-inverse);
  transition:
    background-color var(--motion-duration-fast) var(--motion-ease-out),
    border-color var(--motion-duration-fast) var(--motion-ease-out);
}

.cn-btn svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cn-btn:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}

/* ═══ 行为准则 ═══
   注意：这里用 overflow: clip 而不是 hidden。sticky 有个硬约束 ——
   祖先只要有 overflow:hidden/scroll 就会把它钉死（企业文化叙事那轮踩过），
   而 clip 不创建滚动容器，sticky 照常吸顶，同时还能裁掉光斑的溢出。
   所以「左边说明随滚动吸顶」和「左上角光斑」二者必须靠 clip 才能兼得。 */
.conduct-sec {
  position: relative;
  overflow: clip;
}

/* 行为准则左上角补一层品牌蓝光斑：与「联系我们」右上角那团完全对称、
   同等浓度，方向反过来（这边从左上角渗进来，那边从右上角渗进来）。
   参数与 .contact-glow 逐项对齐：780px 直径、22% 浓度、transparent 62%。 */
.conduct-glow {
  position: absolute;
  top: -300px;
  left: -220px;
  width: 780px;
  height: 780px;
  border-radius: var(--radius-full);
  background: radial-gradient(
    circle at center,
    color-mix(in oklab, var(--color-accent) 22%, transparent),
    transparent 62%
  );
  pointer-events: none;
}

.conduct {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: var(--space-9);
  align-items: start;
}

/* 左边说明跟着滚 —— 右边条目长，不留一句话孤零零停在顶上 */
.conduct-intro {
  position: sticky;
  top: 120px;
}

.conduct-intro .link-more {
  margin-top: var(--space-5);
}

.conduct-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.conduct-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-2) var(--space-5);
  padding: var(--space-6) 0;
  border-top: 1px solid var(--color-line);
}

.conduct-item:last-child {
  border-bottom: 1px solid var(--color-line);
}

.conduct-no {
  grid-row: span 2;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-accent);
}

.conduct-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.conduct-desc {
  max-width: 60ch;
  font-size: var(--font-size-base);
  line-height: var(--font-line-height-relaxed);
  color: var(--color-ink-secondary);
}

/* ═══ 联系 ═══ */
.contact-sec {
  position: relative;
  overflow: hidden;
}

/* 一层很淡的品牌色光斑。字节的联系我们靠这个把「结尾」和上面的内容区分开，
   浓度压到看不出边界，只是让这块不那么平。 */
.contact-glow {
  position: absolute;
  top: -300px;
  right: -220px;
  width: 780px;
  height: 780px;
  border-radius: var(--radius-full);
  background: radial-gradient(
    circle at center,
    color-mix(in oklab, var(--color-accent) 22%, transparent),
    transparent 62%
  );
  pointer-events: none;
}

.contact-inner {
  position: relative;
  z-index: 1;
}

/* 唯一邮箱：居中一行，字号放大到「这就是联系方式的全部」 */
.contact-email {
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-line);
}

.contact-email-label {
  font-size: var(--font-size-sm);
  color: var(--color-ink-tertiary);
}

.contact-email-value {
  display: inline-block;
  margin-top: var(--space-3);
  font-size: clamp(20px, 2.4vw, var(--font-size-3xl));
  font-weight: 600;
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-ink);
}

.contact-email-value:hover {
  color: var(--color-accent);
}

/* ═══ 响应式 ═══ */
@media (max-width: 1024px) {
  .hero {
    padding-top: 120px;
    min-height: 100vh;
  }
  .hero-title {
    font-size: clamp(30px, 8vw, 64px);
  }
  .fp {
    padding-top: 120px;
  }
  /* 窄桌面下左字右图会挤，改成上下摆 */
  .fp-split {
    grid-template-columns: 1fr;
    gap: var(--space-7);
    align-content: center;
  }
  .conduct {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }
  .conduct-intro {
    /* 单列时 sticky 会把说明钉在顶上挡住条目，取消 */
    position: static;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 104px 0 var(--space-6);
    min-height: 100vh;
  }
  /* 手机端主张一行 9 字：字号上限由容器内宽倒推 ——
     390px 视口内宽约 350px，350 / (9 × 1.04) ≈ 37px，取 9.4vw 留出余量不溢出。 */
  .hero-title {
    font-size: clamp(26px, 9.4vw, 46px);
    letter-spacing: 0.04em;
  }
  .hero-brand {
    font-size: clamp(15px, 4.6vw, 22px);
    letter-spacing: 0.3em;
  }
  .hero-en {
    letter-spacing: 0.3em;
  }
  /* 整屏页在手机上不追求「刚好一屏」：内容比一屏高时照样能长 */
  .fp {
    padding: 104px 0 var(--space-6);
  }
  .fp-split {
    flex: none;
    margin: var(--space-8) 0;
  }
  /* 窄屏：整屏页不追求「刚好一屏」，正文上下给固定留白即可 */
  .culture-body {
    margin: var(--space-8) 0;
  }
  /* 标题字号不单独覆盖：主规则的 vw 驱动已能保证窄屏也恰好一行 */
  .conduct-title {
    font-size: var(--font-size-lg);
  }
}
</style>

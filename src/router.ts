import { createRouter, createWebHistory } from "vue-router";

/* 单主题：白底 + 亮蓝。不再按路由切主题。
   顶级导航与路由一一对应：关于我们(/) / 我们的服务 / 我们的产品 / 开发者 / 新闻动态 / 加入我们。
   注意「关于我们」落在根路径 —— 这一站的门面页就是关于我们，不是产品列表页。 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      /* 首页就是「关于我们」—— 这一站的门面页。
         首屏只有品牌主张那一行大字，下面直接接三个整屏页（公司简介 / 愿景及使命 /
         企业文化）+ 行为准则 / 联系我们。
         不在这里铺产品与服务清单，也不放「概览」这类业务架构清单。
         （用户明确要求：关于我们不放具体产品介绍；概览、管理团队、联系表单、
         入口索引、产品入口那一行，都已整块删除。） */
      path: "/",
      name: "home",
      component: () => import("./pages/HomePage.vue"),
      meta: { title: "首页 · witkit 妙计科技" },
    },
    {
      path: "/services",
      name: "services",
      component: () => import("./pages/ServicesPage.vue"),
      meta: { title: "我们的服务 · 三大自研技术体系 · witkit 妙计科技" },
    },
    {
      path: "/products",
      name: "products",
      component: () => import("./pages/ProductsPage.vue"),
      meta: { title: "我们的产品 · witkit 妙计科技" },
    },
    {
      /* 开发者：四个站外入口（产品导航 / 开发者中心 / 代码托管 / 技术论坛）
         + 两个实验室。原来这一堆只写在页脚一列里，2026-09-20 升级成页面。 */
      path: "/developers",
      name: "developers",
      component: () => import("./pages/DevelopersPage.vue"),
      meta: { title: "开发者 · witkit 妙计科技" },
    },
    {
      path: "/tech/:slug",
      name: "tech",
      component: () => import("./pages/TechSystemPage.vue"),
    },
    {
      path: "/product/:slug",
      name: "product",
      component: () => import("./pages/ProductDetailPage.vue"),
    },
    {
      path: "/news",
      name: "news",
      component: () => import("./pages/NewsPage.vue"),
      meta: { title: "新闻动态 · witkit 妙计科技" },
    },
    {
      path: "/news/:slug",
      name: "news-detail",
      component: () => import("./pages/NewsDetailPage.vue"),
    },
    {
      /* 加入我们不再单独建页（用户 2026-09-20 决定）：直接跳首页「联系我们」锚点。
         老的 /careers 保留为跳转，书签、外部链接、搜索引擎里已有的地址不 404。 */
      path: "/careers",
      redirect: () => ({ path: "/", hash: "#contact" }),
    },
    {
      /* 老的 /about 保留为跳转：外部链接、用户书签、页脚里的 /about#contact
         不能因为改了结构就断掉，hash 一并带过去。 */
      path: "/about",
      redirect: (to) => ({ path: "/", hash: to.hash }),
    },
    {
      /* 未匹配的地址不留白屏，也不渲染首页冒充（会产生重复内容），直接回到首页 */
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
  /* 带 hash 的跳转一律**瞬时定位**，不做平滑滚动。
     用户：「点击加入我们，以及别的要跳转到这个界面的直接定位到那里，不要从上面滚动下来。」
     原来写的是 behavior: "smooth" —— 从别的页点「加入我们」（→ /#contact）时，
     页面先渲染在顶部、再从顶部一路滚到「联系我们」，看起来像页面在往下滑，很别扭。
     瞬时定位就没有这个过程，点完直接就在那儿。 */

  /* ⚠️ 恢复滚动位置前必须等文档高度稳定，否则会被浏览器的「滚动锚定」带偏。
     实测（1440×900）：/services 滚到 HEC 那条「查看 HEC 技术细节 →」（scrollY=2175）
     → 点进 /tech/hec → 点浏览器返回，落点 4561（已贴近页面底部），偏了 2386px。

     根因不在 vue-router —— 它确实调了 scrollTo({top: 2175})，目标是对的。
     问题是那一刻页面还在 loading 态：各页 onMounted 里都是 `await api.xxx()`，
     即使数据就在本地、只是晚一个微任务，首帧照样先渲染「正在加载…」的矮页面
     （文档 3781 高）。等数据到位、文档长到 6167（+2386）时，
     浏览器的滚动锚定为了「保持视口里正在看的内容不动」，把滚动位置也推了 +2386。
     两个 2386 一模一样，就是锚定的签名。

     所以：先等文档高度连着两帧不变，再交给 vue-router 定位 —— 锚定就没有可推的余地。
     兜底 30 帧（约半秒），防止某页高度一直在变导致永远不返回。
     首次进入（无 savedPosition、无 hash）直接回顶部，不走这个等待，不拖慢首次加载。 */
  scrollBehavior(to, _from, savedPosition) {
    if (to.hash) {
      return whenStable().then(() => ({
        el: to.hash,
        top: 88,
        behavior: "auto",
      }));
    }
    if (savedPosition) {
      return whenStable().then(() => savedPosition);
    }
    return { top: 0 };
  },
});

/* 等 document 高度稳定（连续两帧不变）再 resolve。
   数据是同步的、只晚一个微任务，通常 2–3 帧就够，肉眼无感。 */
function whenStable(maxFrames = 30): Promise<void> {
  return new Promise((resolve) => {
    let last = -1;
    let stableFrames = 0;
    let frames = 0;

    const tick = () => {
      const h = document.documentElement.scrollHeight;
      if (h === last) stableFrames++;
      else {
        stableFrames = 0;
        last = h;
      }
      frames++;
      if (stableFrames >= 2 || frames >= maxFrames) resolve();
      else requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

/* 详情页标题要等数据到位才能定，所以这里只兜住列表页与静态页：
   meta.title 有值就用，否则退回默认标题，不至于把上一页的标题带过去。 */
const DEFAULT_TITLE = "witkit 妙计科技 · 以科技聚力改变未来";
router.afterEach((to) => {
  document.title = (to.meta.title as string | undefined) ?? DEFAULT_TITLE;
});

export default router;

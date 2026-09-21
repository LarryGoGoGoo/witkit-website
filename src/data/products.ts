/**
 * 产品清单 —— 顶栏产品面板 与 页脚的产品链接共用同一份。
 *
 * 为什么抽出来：同一个产品名/链接在两个地方各写一份，改名时必漏一处。
 * 现在只有这一个源，改这里两处同时生效。
 *
 * ⚠️ 不要再给「关于我们」页接这里的数据 —— 那一页按用户要求不放任何产品名与产品链接
 *    （原来底部那行「产品入口」已删）。产品入口只有两处：顶栏面板、页脚。
 *
 * url 都是产品的真实站点，点一下直接跳过去（新窗口）；
 * 与 mocks/data.ts 里的 url 保持一致，改动时两处一起改。
 */

export interface ProductLink {
  name: string;
  url: string;
}

export interface ProductGroup {
  title: string;
  items: ProductLink[];
}

export const productGroups: ProductGroup[] = [
  {
    title: "开发与部署",
    items: [
      { name: "E时代IDE", url: "https://ide.emoera.com/" },
      { name: "E时代云服务", url: "https://cloud.emoera.com/" },
      { name: "E时代Git", url: "https://git.emoera.com/explore/repos" },
      { name: "E时代云剪贴板", url: "https://code.emoera.cn/" },
    ],
  },
  {
    title: "身份与验证",
    items: [
      { name: "WeAuth 微验", url: "https://www.weauth.cn/" },
      { name: "E时代信任中心", url: "https://trust.emoera.com/" },
    ],
  },
  {
    title: "数据与存储",
    items: [
      { name: "E时代云数据库", url: "https://ecd.cloud.emoera.com/" },
      { name: "E时代云存储", url: "https://eoss.cloud.emoera.com/" },
      { name: "E时代图床", url: "https://image.emoera.cn/" },
    ],
  },
  {
    title: "社区与生态",
    items: [
      { name: "E时代论坛", url: "https://ideawit.com/" },
      { name: "E时代比赛报名", url: "https://acm.emoera.cn/" },
    ],
  },
];

/** 旗舰产品：顶栏面板右下的推荐位用它 */
export const flagship: ProductLink = {
  name: "E时代IDE",
  url: "https://ide.emoera.com/",
};

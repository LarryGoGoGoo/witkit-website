/**
 * 开发者入口 —— 顶栏 / 开发者页 / 页脚「开发者」一列共用同一份。
 *
 * 为什么抽出来：这四个入口原来只写在页脚，2026-09-20 用户要求把页脚那一列
 * 升级成一个真正的页面（导航栏加一项「开发者」），于是变成两个地方要用。
 * 与 products.ts 同样的理由 —— 同一个链接写两遍，改名时必漏一处。
 *
 * ⚠️ 全部是**站外站点**。页面与页脚都只做入口，不转述各站内容 ——
 *    替别的站点说它有什么，写出来就是编（实验室那轮吃过这个亏）。
 *    但「只做入口」不等于「只罗列名字」：每个入口配一句 blurb，
 *    解释这个入口是干嘛的（基于名称与域名），不描述那个站里有什么功能。
 *
 * host 是拿来给人看「点开去哪」的，直接从 url 抄，别单独维护。
 */

export interface DevEntry {
  /** 行首编号，纯装饰 */
  no: string;
  /** 显示名，同时是 i18n 的 key */
  name: string;
  /** 一句话用途说明：解释「这个入口是干嘛的」（基于名称与域名），
   *  不是描述站里有什么功能。同时是 i18n 的 key。 */
  blurb: string;
  /** 展示用的域名，与 url 同源 */
  host: string;
  url: string;
}

export const devEntries: DevEntry[] = [
  {
    no: "01",
    name: "产品导航",
    blurb: "各产品站点的集中索引。",
    host: "nav.emoera.com",
    url: "https://nav.emoera.com/",
  },
  {
    no: "02",
    name: "开发者中心",
    blurb: "面向开发者的统一入口。",
    host: "developer.emoera.com",
    url: "https://developer.emoera.com/",
  },
  {
    no: "03",
    name: "代码托管",
    blurb: "Git 仓库托管与代码协作。",
    host: "git.emoera.com",
    url: "https://git.emoera.com/explore/repos",
  },
  {
    no: "04",
    name: "技术论坛",
    blurb: "开发者交流与讨论的社区。",
    host: "ideawit.com",
    url: "https://ideawit.com/",
  },
];

/**
 * 两个实验室 —— 站外站点，官网只放外链、不配图。
 *
 * 结构：妙计实验室是母体，启发实验室（E时代协会的算法与开发中心）与 E时代科技在其下。
 * 页面上实验室卡片的正文（description / focus）走 /api/team 拿，
 * 这里只给页脚用的名字与链接；**url 必须与 src/mocks/data.ts 的 labs 保持一致，改动时两处一起改**。
 */
export const labLinks: Array<{ name: string; url: string }> = [
  { name: "妙计实验室", url: "https://home.miaojilab.cn/" },
  { name: "启发实验室", url: "https://www.qifalab.cn/qifalab-v1/" },
];

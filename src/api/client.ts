import { labs, news, products, teamMetrics, techSystems } from "../mocks/data";
import type {
  ApiResponse,
  Lab,
  Metric,
  NewsItem,
  ProductDetail,
  TechSystemDetail,
} from "./types";

/* 本地数据源：官网后端还没写，所有页面数据直接从前端 mock 层读。
   这是临时方案 —— 等真后端就绪，把下面每个方法的实现换成 fetch，
   方法签名不变，页面一处都不用改。

   为什么不再用 MSW（service worker）模拟 HTTP：
   service worker 要先注册、激活才能拦截请求，首次访问有一小段竞态窗口，
   请求会穿透到 SPA fallback 返回 HTML，于是 res.json() 爆「Unexpected token '<'」。
   后端没写、数据全是静态的前提下，用 service worker 模拟 HTTP 是过度设计，
   去掉它既消除竞态，也让生产包少了 300KB+ 的 MSW worker。 */

/* 新闻排序（原先在 handlers 里做）：置顶优先，其次按发布时间倒序。
   排序放在这一层，将来换成真后端时前端仍不用管顺序。 */
const newsSorted = [...news].sort((a, b) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return b.published_at.localeCompare(a.published_at);
});

export const api = {
  /* 列表直接返回完整对象（见 openapi.yaml 说明）：
     官网数据量小，页面一次拿全，避免为拿 features/metrics 再发 N 次详情请求。 */
  async listProducts(
    category?: string,
    featured?: boolean,
  ): Promise<ApiResponse<ProductDetail>> {
    let items = products;
    if (category) items = items.filter((p) => p.category === category);
    if (featured !== undefined)
      items = items.filter((p) => p.featured === featured);
    return { items, total: items.length };
  },

  async getProduct(slug: string): Promise<ProductDetail> {
    const product = products.find((p) => p.slug === slug);
    if (!product) throw new Error("资源不存在");
    return product;
  },

  async listTechSystems(): Promise<ApiResponse<TechSystemDetail>> {
    return { items: techSystems, total: techSystems.length };
  },

  async getTechSystem(slug: string): Promise<TechSystemDetail> {
    const system = techSystems.find((s) => s.slug === slug);
    if (!system) throw new Error("资源不存在");
    return system;
  },

  async getTeam(): Promise<{ labs: Lab[]; metrics: Metric[] }> {
    return { labs, metrics: teamMetrics };
  },

  async listNews(category?: string): Promise<ApiResponse<NewsItem>> {
    const items = category
      ? newsSorted.filter((n) => n.category === category)
      : newsSorted;
    return { items, total: items.length };
  },

  async getNews(slug: string): Promise<NewsItem> {
    const item = news.find((n) => n.slug === slug);
    if (!item) throw new Error("资源不存在");
    return item;
  },
};

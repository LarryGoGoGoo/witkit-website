/** API 类型定义 —— 与 openapi.yaml 契约对齐 */
export interface Product {
  slug: string;
  name: string;
  description: string;
  category: "core" | "ecosystem" | "team";
  tags: string[];
  url: string | null;
  featured: boolean;
  status: "live" | "beta" | "planned";
}

export interface ProductDetail extends Product {
  long_description: string;
  features: { title: string; description: string }[];
  metrics: Metric[];
  tech_system: string | null;
}

export interface TechSystem {
  slug: string;
  name: string;
  full_name: string;
  description: string;
  icon: string | null;
}

export interface TechSystemDetail extends TechSystem {
  long_description: string;
  features: { title: string; description: string }[];
  metrics: Metric[];
}

export interface Lab {
  slug: string;
  name: string;
  description: string;
  focus: string;
  url: string | null;
}

export interface Metric {
  label: string;
  value: string;
  unit: string | null;
}

/** 新闻动态 */
export interface NewsItem {
  slug: string;
  title: string;
  summary: string;
  category: NewsCategory;
  /** 发布时间，YYYY-MM-DD。排序与展示都用它，不在前端做二次格式化 */
  published_at: string;
  /** 置顶：列表页头条大图位 */
  pinned: boolean;
  /** 正文段落。官网新闻为短文，按段落存数组，前端直接渲染，不做 Markdown 解析 */
  body: string[];
}

export type NewsCategory = "公司动态" | "产品发布" | "技术分享" | "生态合作";

export interface ContactRequest {
  name: string;
  email: string;
  company?: string;
  message: string;
}

export interface ApiResponse<T> {
  items?: T[];
  total?: number;
  [key: string]: unknown;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

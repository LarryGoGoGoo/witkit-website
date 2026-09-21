/**
 * 站点语言（简 / 繁）。
 *
 * 设计取舍：
 * 1. **不用 vue-i18n** —— 全站只要 t() + 一个 locale 状态，40 行就够，省掉几十 KB 依赖。
 * 2. **中文原文直接当 key**。理由：
 *    - 模板里 `t("我们的服务")` 一眼能看出用户看到什么，不用回头查 key 表
 *    - 中文表就不用存在了 —— 找不到翻译时 t() 原样返回 key，简体天然是对的
 *    - tw 表只写「翻译」，表里没有的条目 = 还没翻（降级成中文，不会出乱码）
 * 3. tw 由 `scripts/build-i18n.mjs` 用 OpenCC（cn→tw）从 key 生成，是生成物，不要手改。
 * 4. locale 存 localStorage；切换时同步 <html lang>（无障碍与 SEO 都读它）。
 *
 * 2026-09-20 起只留简 / 繁两档：用户决定砍掉英文（英文文案普遍重写的工作量不划算，
 * 全站英文界面相当于重新设计一遍）。品牌代号（HEC/UEF/CEP、witkit）本身是拉丁字母，
 * 不参与翻译，不受影响。
 */
import { ref, watchEffect } from "vue";
import tw from "./tw";

export type Locale = "zh" | "tw";

export const LOCALES: { code: Locale; label: string; htmlLang: string }[] = [
  { code: "zh", label: "简", htmlLang: "zh-CN" },
  { code: "tw", label: "繁", htmlLang: "zh-Hant" },
];

const STORAGE_KEY = "witkit-locale";

/** 简体的「翻译表」是空的 —— t() 找不到就返回 key 本身，正好就是中文原文 */
const tables: Record<Locale, Record<string, string>> = { zh: {}, tw };

function isLocale(v: unknown): v is Locale {
  return v === "zh" || v === "tw";
}

function readInitial(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* 隐私模式下 localStorage 会抛，忽略 */
  }
  return "zh";
}

export const locale = ref<Locale>(readInitial());

watchEffect(() => {
  const meta = LOCALES.find((l) => l.code === locale.value);
  document.documentElement.lang = meta?.htmlLang ?? "zh-CN";
  try {
    localStorage.setItem(STORAGE_KEY, locale.value);
  } catch {
    /* 同上 */
  }
});

export function setLocale(next: Locale) {
  locale.value = next;
}

/**
 * 取文案。模板里直接 `{{ t("关于我们") }}`。
 * 内部读了 locale.value，所以切语言整棵树会跟着重渲染。
 * `vars` 用来替换 `{name}` 这类占位符 —— 带变量的句子 key 里保留占位符即可。
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const text = tables[locale.value]?.[key] ?? key;
  return vars ? fill(text, vars) : text;
}

function fill(text: string, vars: Record<string, string | number>): string {
  let out = text;
  for (const [k, v] of Object.entries(vars))
    out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

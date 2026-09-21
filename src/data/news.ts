/**
 * 新闻内容层
 *
 * 一篇新闻 = `content/news/` 下的一个 .md 文件。这里负责把那些文件读进来、
 * 校验、变成页面要的 NewsItem 数组。
 *
 * 为什么自己解析、不引 md 库：
 *   官网新闻的结构是固定的（几个标量字段 + 若干段落），用不上 Markdown 的完整语法。
 *   几十行搞定，省一个依赖，字段写错时还能给出看得懂的中文报错。
 *
 * 为什么字段写错是「跳过这一篇 + 报错」而不是「整个页面崩掉」：
 *   一个人写错一个字段，不该连累其它页面打不开。
 *   被跳过的那篇会在控制台点名，跑 `npm run check:news` 也能查出来。
 *
 * 加新闻：看同目录旁的 content/news/README.md，不用改这个文件。
 */
import type { NewsCategory, NewsItem } from "../api/types";

/* eager + ?raw：构建期就把文件内容打进包里，运行时零请求。
   新闻是官网自己的内容，不是用户数据，没必要为此发一次网络请求。 */
const FILES = import.meta.glob("../../content/news/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const CATEGORIES: readonly NewsCategory[] = [
  "公司动态",
  "产品发布",
  "技术分享",
  "生态合作",
];

/** frontmatter 整体：开头 `---` 包住的一段，后面是正文 */
const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const CJK_PUNCT = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/;

/** 解析 frontmatter。只认 `key: value` 这种最简单的写法 —— 够用，也不会误判 */
function parseFrontmatter(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue; /* 空行和注释行跳过 */
    const i = s.indexOf(":");
    if (i < 0) continue;
    const key = s.slice(0, i).trim();
    let value = s.slice(i + 1).trim();
    /* 习惯性加引号的写法也认，去掉成对的引号 */
    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));
    if (quoted) value = value.slice(1, -1).trim();
    out[key] = value;
  }
  return out;
}

/** 段内折行拼回一行。中文之间不加空格，否则会在句子里冒出多余空白 */
function joinLines(block: string): string {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .reduce((acc, line) => {
      if (!acc) return line;
      const glue =
        CJK_PUNCT.test(acc.slice(-1)) && CJK_PUNCT.test(line.slice(0, 1));
      return acc + (glue ? "" : " ") + line;
    }, "");
}

/** 空行分段。写多长都行，只有空行才算分段 */
function parseBody(text: string): string[] {
  return text
    .split(/\r?\n[ \t]*\r?\n/)
    .map(joinLines)
    .filter(Boolean);
}

function build(): { items: NewsItem[]; problems: string[] } {
  const items: NewsItem[] = [];
  const problems: string[] = [];
  const seenSlug = new Set<string>();

  /* 显式排序：glob 的 key 顺序不保证稳定，排序后报错顺序才不会跳来跳去 */
  const entries = Object.entries(FILES).sort(([a], [b]) => a.localeCompare(b));

  for (const [path, raw] of entries) {
    const file = path.split("/").pop() ?? path;
    /* `_` 开头的是模板，README 是说明 —— 都不是新闻内容 */
    if (file.startsWith("_") || file.toLowerCase() === "readme.md") continue;

    const m = FRONT.exec(raw.trim());
    if (!m) {
      problems.push(`${file}：开头缺 frontmatter（字段要用 --- 包起来）`);
      continue;
    }

    const fm = parseFrontmatter(m[1]);
    const title = fm.title ?? "";
    const slug = fm.slug ?? "";
    const date = fm.date ?? "";
    const category = fm.category ?? "";
    const summary = fm.summary ?? "";
    const pinned = (fm.pinned ?? "").toLowerCase() === "true";

    /* 一次把问题报全，免得改一个跑一次 */
    const bad: string[] = [];
    if (!title) bad.push("缺 title");
    if (!summary) bad.push("缺 summary");
    if (!slug) bad.push("缺 slug");
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      bad.push(`slug「${slug}」不合法（只能小写字母、数字、连字符）`);
    if (!date) bad.push("缺 date");
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      bad.push(`date「${date}」格式不对（要 YYYY-MM-DD）`);
    if (!CATEGORIES.includes(category as NewsCategory))
      bad.push(`category「${category || "空"}」不在允许的四类里`);

    if (bad.length) {
      problems.push(`${file}：${bad.join("，")}`);
      continue;
    }
    if (seenSlug.has(slug)) {
      problems.push(`${file}：slug「${slug}」和另一篇重复了`);
      continue;
    }
    seenSlug.add(slug);

    const body = parseBody(m[2]);
    if (!body.length) {
      /* 正文空不算致命：先把标题挂上去，但要点名让人补 */
      problems.push(
        `${file}：没有正文（frontmatter 结束的 --- 下面要空一行再写）`,
      );
    }

    items.push({
      slug,
      title,
      summary,
      category: category as NewsCategory,
      published_at: date,
      pinned,
      body,
    });
  }

  return { items, problems };
}

const built = build();

/** 全部新闻。顺序交给 handlers 排（置顶优先 + 日期倒序），这里不管顺序 */
export const news: NewsItem[] = built.items;

/** 没有通过校验的文件及其原因。空数组 = 内容都没问题 */
export const newsProblems: string[] = built.problems;

if (built.problems.length) {
  /* 一条模板串写完，别拼 + —— biome 会把它标成 useTemplate（ERROR 级） */
  console.error(
    `[news] content/news 下有 ${built.problems.length} 处问题，相关文件已跳过：\n${built.problems
      .map((p) => `  · ${p}`)
      .join("\n")}`,
  );
}

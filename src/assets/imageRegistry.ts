/**
 * 图片登记表
 *
 * 为什么用 import.meta.glob 而不是把图丢进 public/ 再写死路径：
 *   写死路径时，「图还没做」= 浏览器请求 404 = 控制台报错。
 *   而第 2 步的过关条件是「零 console 报错」，所以不能靠写死路径。
 *   glob 是构建期静态分析：只有真实存在的文件才进清单，
 *   图没做就天然走占位分支，一个请求都不发，控制台干干净净。
 *
 * 换图方式：把图片按下面的目录约定丢进 src/assets/images/，文件名对上就自动生效，
 * 不用改任何代码，也不用改这里。支持 png / jpg / jpeg / webp / avif / svg / gif。
 * 动图优先用 animated WebP（体积小、全彩、带半透明）；GIF 也能放，但只有 256 色。
 */

const modules = import.meta.glob(
  "./images/**/*.{png,jpg,jpeg,webp,avif,svg,gif}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
) as Record<string, string>;

/** key 去掉 "./images/" 前缀和扩展名，例如 "./images/products/ide.png" → "products/ide" */
const registry = new Map<string, string>();
for (const [path, url] of Object.entries(modules)) {
  const key = path.replace(/^\.\/images\//, "").replace(/\.[^./]+$/, "");
  registry.set(key, url);
}

/** 拿到图片的真实 URL；没这张图时返回 undefined */
export function imageUrl(key: string): string | undefined {
  return registry.get(key);
}

/** 这张图到位了没 */
export function hasImage(key: string): boolean {
  return registry.has(key);
}

/** 当前已就位的图片数量，占位清单页用来统计进度 */
export function readyCount(keys: string[]): number {
  return keys.filter((k) => registry.has(k)).length;
}

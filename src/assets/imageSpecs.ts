/**
 * 图片规格查询
 *
 * 组件不写死「1440 × 900」这类数字，统一从这里取。
 * 好处：规格只有一份，占位框显示的内容和图片需求清单永远一致。
 */
import raw from "./imageSpecs.json";

export interface ImageSpec {
  /** 图片键 = src/assets/images 下的相对路径（不含扩展名） */
  slot: string;
  /** 出现在哪些位置 */
  where: string;
  /** 宽高比，CSS aspect-ratio 写法 */
  ratio: string;
  /** 目标像素尺寸 */
  px: string;
  /** 格式要求 */
  format: string;
  /** 画面内容要求 */
  content: string;
  /** 必做 / 建议 / 可选 */
  priority: string;
  /** true 表示不走 src/assets，而是 public/ 下的固定路径（favicon、og 封面） */
  external: boolean;
  /** external 为 true 时的公开路径 */
  publicPath?: string;
}

const slots = (raw as { slots: ImageSpec[] }).slots;
const index = new Map(slots.map((s) => [s.slot, s]));

const FALLBACK: ImageSpec = {
  slot: "",
  where: "—",
  ratio: "16 / 10",
  px: "",
  format: "",
  content: "",
  priority: "—",
  external: false,
};

/** 取某个图片位的规格；没登记过就返回一份空壳，不至于让页面崩掉 */
export function specOf(slot: string): ImageSpec {
  return index.get(slot) ?? { ...FALLBACK, slot };
}

/** 全部图片位 */
export const allSpecs: ImageSpec[] = slots;

/** 走 src/assets/images 的图片位（可以在自检脚本里核对到位情况） */
export const managedSlots: string[] = slots
  .filter((s) => !s.external)
  .map((s) => s.slot);

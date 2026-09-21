#!/usr/bin/env python
"""把一个源图装进某个图片位（slot）。

为什么要脚本而不是手工拖图：
  1. 每个位有自己的宽高比（8:5 / 16:10 / 2:1 / 16:9 / 整屏），源图比例千差万别，
     必须裁到位的比例，否则 object-fit:cover 会在页面里随机裁 —— 裁掉的正好是主体。
  2. 清单要求 2x 出图、单张 < 300KB。脚本按 imageSpecs 里的尺寸算目标像素、
     按质量递减压到体积达标，不靠手感。
  3. 顺手打印「源 → 目标」的真实数字（尺寸 / 体积 / 裁剪比例），选图这件事要留证据。

用法：
  python scripts/set-slot-image.py --slot about/company --src 图片精选/office_7163373.jpg
  python scripts/set-slot-image.py --slot careers/office --src 图片精选/office_31709104.jpg \
      --ratio 2/1 --gravity center --max-kb 300

约定：
  · 输出文件名 = slot 的路径 + .webp（照片一律 WebP，体积最小、全彩）
  · 目标像素 = min(规格 2x 尺寸, 源图尺寸)，默认不放大（放大只会更糊，见 --allow-upscale）
  · 旧的不同扩展名文件会被删掉（同一 slot 只留一份，登记表按同名匹配、不看扩展名）
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SPECS = ROOT / "src/assets/imageSpecs.json"
OUT_ROOT = ROOT / "src/assets/images"


def parse_ratio(text: str, spec_ratio: str) -> float:
    """'2/1' / '1.78' / '16 / 10' → float"""
    raw = text or spec_ratio
    raw = raw.replace(" ", "")
    if raw == "auto" or not raw:
        return 16 / 9
    if "/" in raw:
        a, b = raw.split("/", 1)
        return float(a) / float(b)
    return float(raw)


def parse_px(text: str) -> tuple[int, int] | None:
    """'1600 × 1000 px（...）' → (1600, 1000)"""
    digits = "".join(c if c.isdigit() else " " for c in text).split()
    if len(digits) >= 2:
        return int(digits[0]), int(digits[1])
    return None


def spec_of(slot: str) -> dict:
    data = json.loads(SPECS.read_text(encoding="utf-8"))
    for s in data["slots"]:
        if s["slot"] == slot:
            return s
    raise SystemExit(f"规格表里没有这个位：{slot}")


def crop_to(img: Image.Image, ratio: float, gravity: str) -> Image.Image:
    w, h = img.size
    if abs(w / h - ratio) < 0.005:
        return img
    if w / h > ratio:  # 太宽 → 裁两侧
        new_w = int(round(h * ratio))
        if gravity == "left":
            left = 0
        elif gravity == "right":
            left = w - new_w
        else:
            left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    new_h = int(round(w / ratio))  # 太高 → 裁上下
    if gravity == "top":
        top = 0
    elif gravity == "bottom":
        top = h - new_h
    else:
        top = (h - new_h) // 2
    return img.crop((0, top, w, top + new_h))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slot", required=True)
    ap.add_argument("--src", required=True)
    ap.add_argument("--ratio", default="", help="默认取规格里的 ratio；auto 视为 16:9")
    ap.add_argument(
        "--scale",
        type=float,
        default=1.0,
        help="倍率。规格里的 px 已经是交付像素（如 logo 630×120 / 企业文化 2880×1620），"
        "所以默认 1.0；要更高清就传 1.25/1.5",
    )
    ap.add_argument(
        "--max-upscale",
        type=float,
        default=1.0,
        help="允许放大的上限倍数（相对裁切后的源尺寸）。默认 1.0 = 不放大；"
        "放大只会更糊，只有抽象图 / 需要高分屏时才适当放宽",
    )
    ap.add_argument("--gravity", default="center", choices=("center", "top", "bottom", "left", "right"))
    ap.add_argument("--max-kb", type=int, default=300)
    ap.add_argument("--ext", default="webp")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    spec = spec_of(args.slot)
    ratio = parse_ratio(args.ratio, spec.get("ratio", "auto"))
    src_path = Path(args.src)
    if not src_path.is_absolute():
        src_path = ROOT / src_path
    if not src_path.exists():
        raise SystemExit(f"源图不存在：{src_path}")

    with Image.open(src_path) as raw:
        src_w, src_h = raw.size
        img = raw.convert("RGB")
        img = crop_to(img, ratio, args.gravity)

        want = parse_px(spec.get("px", ""))
        target = None
        if want:
            target = (int(round(want[0] * args.scale)), int(round(want[1] * args.scale)))
            # 裁过之后按位的比例重算目标高，避免规格里的比例和裁切后不一致
            target = (target[0], int(round(target[0] / ratio)))
        if target is None:
            target = img.size
        cap_w = int(round(img.width * args.max_upscale))
        cap_h = int(round(img.height * args.max_upscale))
        target = (min(target[0], cap_w), min(target[1], cap_h))
        # 裁过之后按位的比例重算目标高，避免规格里的比例和裁切后不一致
        target = (target[0], int(round(target[0] / ratio)))

        if img.size != target:
            img = img.resize(target, Image.LANCZOS)

        out = OUT_ROOT / f"{args.slot}.{args.ext}"
        if not args.dry_run:
            out.parent.mkdir(parents=True, exist_ok=True)
            quality = 88
            while True:
                img.save(out, "WEBP", quality=quality, method=6)
                kb = out.stat().st_size / 1024
                if kb <= args.max_kb or quality <= 52:
                    break
                quality -= 6

        after = out.stat().st_size / 1024 if out.exists() and not args.dry_run else 0

    # 同位的其它扩展名旧文件清掉，避免登记表命中两份
    stale = []
    for p in OUT_ROOT.rglob(f"{Path(args.slot).name}.*"):
        if p.parent == out.parent and p != out:
            stale.append(p)
            if not args.dry_run:
                p.unlink()
    for d in sorted({p.parent for p in stale}, reverse=True):
        if not any(d.iterdir()):
            d.rmdir()

    try:
        src_label = str(src_path.relative_to(ROOT))
    except ValueError:
        src_label = str(src_path)
    print(
        f"✓ {args.slot}\n"
        f"   源  {src_label}  {src_w}×{src_h}\n"
        f"   出  {out.relative_to(ROOT)}  {img.width}×{img.height}  {after:.0f} KB"
        f"（q={quality if not args.dry_run else '-'}）\n"
        f"   比例 {ratio:.3f}  裁剪 {args.gravity}"
        + (f"\n   清掉旧文件 {[str(s.name) for s in stale]}" if stale else "")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

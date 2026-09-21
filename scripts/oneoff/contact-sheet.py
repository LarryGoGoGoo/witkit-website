#!/usr/bin/env python
"""选图用的接触印样（contact sheet）生成器。

为什么要有它：候选图一两百张，逐张打开太慢；把一批缩略图拼成一张带文件名标签的
大图，一次就能横向比较。配合 `--dark` / `--landscape` 这类客观预筛，先把明显不合适
的（太亮、竖构图、糊）剔掉，再人眼做最后取舍。

用法：
  python scripts/contact-sheet.py --src 图片精选 --out .shots/sheet/hero.png \
      --kinds abstract,city,circuit,network,tech --darwin --landscape --top 12
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageStat

THUMB_W = 384
THUMB_H = 240
PAD = 10
LABEL_H = 26
BG = (18, 20, 26)
FG = (232, 236, 244)
ACCENT = (96, 165, 250)


def font(size: int = 15):
    for name in ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def metrics(path: Path) -> tuple[float, int, int]:
    """返回 (平均亮度 0-255, 宽, 高)。"""
    with Image.open(path) as im:
        im = im.convert("L")
        w, h = im.size
        lum = ImageStat.Stat(im.resize((160, 160))).mean[0]
    return lum, w, h


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="图片精选")
    ap.add_argument("--out", required=True)
    ap.add_argument("--kinds", default="", help="逗号分隔的题材前缀，空=全部")
    ap.add_argument("--files", default="", help="逗号分隔的显式文件名，优先于 --kinds")
    ap.add_argument("--landscape", action="store_true", help="只要横构图")
    ap.add_argument("--dark", action="store_true", help="只要平均亮度 < 110")
    ap.add_argument("--bright", action="store_true", help="只要平均亮度 >= 110")
    ap.add_argument("--top", type=int, default=12)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--sort", default="name", choices=("name", "dark", "bright"))
    ap.add_argument("--recursive", action="store_true", help="连子目录一起扫（站内图用）")
    ap.add_argument("--thumb-w", type=int, default=THUMB_W, help="单格宽，决赛圈对比时调大")
    args = ap.parse_args()
    thumb_w = args.thumb_w
    thumb_h = int(round(thumb_w * THUMB_H / THUMB_W))

    src = Path(args.src)
    if args.files:
        files = [src / f.strip() for f in args.files.split(",") if f.strip()]
    else:
        kinds = [k.strip() for k in args.kinds.split(",") if k.strip()]
        walk = src.rglob("*") if args.recursive else src.iterdir()
        files = sorted(
            p
            for p in walk
            if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
            and p.is_file()
            and (not kinds or p.name.split("_")[0] in kinds)
        )

    scored = []
    for p in files:
        if not p.exists():
            print(f"跳过（不存在）：{p}", file=sys.stderr)
            continue
        lum, w, h = metrics(p)
        if args.landscape and w < h:
            continue
        if args.dark and lum >= 110:
            continue
        if args.bright and lum < 110:
            continue
        scored.append((p, lum, w, h))

    if args.sort == "dark":
        scored.sort(key=lambda r: r[1])
    elif args.sort == "bright":
        scored.sort(key=lambda r: -r[1])

    scored = scored[: args.top]
    if not scored:
        print("没有符合筛选条件的图", file=sys.stderr)
        return 1

    cols = args.cols
    rows = (len(scored) + cols - 1) // cols
    cell_w = thumb_w + PAD * 2
    cell_h = thumb_h + LABEL_H + PAD * 2
    sheet = Image.new("RGB", (cell_w * cols, cell_h * rows), BG)
    draw = ImageDraw.Draw(sheet)
    f = font()

    for i, (p, lum, w, h) in enumerate(scored):
        cx = (i % cols) * cell_w
        cy = (i // cols) * cell_h
        with Image.open(p) as im:
            im = im.convert("RGB")
            # 居中裁剪成 16:10 再缩，保证每格观感公平（都能看到画面中心）
            target = thumb_w / thumb_h
            iw, ih = im.size
            if iw / ih > target:
                new_w = int(ih * target)
                im = im.crop(((iw - new_w) // 2, 0, (iw + new_w) // 2, ih))
            else:
                new_h = int(iw / target)
                im = im.crop((0, (ih - new_h) // 2, iw, (ih + new_h) // 2))
            im = im.resize((thumb_w, thumb_h), Image.LANCZOS)
            sheet.paste(im, (cx + PAD, cy + PAD))
        draw.text((cx + PAD, cy + PAD + thumb_h + 5), p.name, FG, font=f)
        draw.text(
            (cx + PAD + thumb_w - 134, cy + PAD + thumb_h + 5),
            f"{w}x{h} L{int(lum)}",
            ACCENT if lum < 110 else FG,
            font=f,
        )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"{out}  ({len(scored)} 张)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python
"""把首屏拆成「无字背景 + 透明立体字」两层。

输入两张 ImageGen 生成的图（都在 .shots/hero-gen/）：
  1. 无字背景图 —— 深蓝夜景城市，只有右下角水印
  2. 立体字图   —— 纯黑底 + 九字「以科技聚力改变未来」，右下角水印

输出（都进 src/assets/images/，由 imageRegistry 自动接管）：
  hero-bg.webp   16:9 无字背景（裁掉水印，压到 <=500KB）
  hero-word.png  透明底立体字（1536×864，字居中，保留边缘虹彩）

字图抠透明用「亮度 → alpha」软阈值：
  背景噪点亮约 3~5，字面中位 37、均值 75。lum<10 压掉噪点，10~55 平滑过渡
  保留边缘虹彩反光（冷白/冰蓝/香槟金都在这个亮度段），不硬切。
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SHOTS = ROOT / ".shots" / "hero-gen"
OUT = ROOT / "src" / "assets" / "images"

W, H = 1536, 864  # 16:9 目标


def find_newest(keyword: str) -> Path:
    cands = sorted(SHOTS.glob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
    for c in cands:
        if keyword in c.name:
            return c
    raise SystemExit(f"找不到含「{keyword}」的图")


def luminance(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return 0.299 * r + 0.587 * g + 0.114 * b


def crop_to_16_9(img: Image.Image) -> Image.Image:
    w, h = img.size
    target_h = int(round(w / (16 / 9)))
    if h <= target_h:
        return img.resize((W, H), Image.LANCZOS)
    # 太高：裁上下（水印在底部，优先裁掉底部）
    keep_top = max(0, h - target_h - int(h * 0.02))
    top = min(keep_top, max(0, h - target_h))
    return img.crop((0, top, w, top + target_h)).resize((W, H), Image.LANCZOS)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)

    # ── 1. 无字背景 ──
    bg_path = find_newest("宽屏电影级")
    with Image.open(bg_path) as raw:
        bg = raw.convert("RGB")
        # 先裁掉底部水印带（y > 950）
        w, h = bg.size
        bg = bg.crop((0, 0, w, min(h, 950)))
        bg = crop_to_16_9(bg)
        quality = 88
        while True:
            bg.save(OUT / "hero-bg.webp", "WEBP", quality=quality, method=6)
            if (OUT / "hero-bg.webp").stat().st_size / 1024 <= 500 or quality <= 52:
                break
            quality -= 6
    print(f"背景 ✓ hero-bg.webp {bg.width}×{bg.height} q={quality}")

    # ── 2. 立体字抠透明 ──
    word_path = find_newest("以科技聚力改变未来")
    with Image.open(word_path) as raw:
        src = raw.convert("RGB")
        w, h = src.size
        # 去掉水印带：把底部 y>950 置黑（不是裁，保持整图便于定位字）
        arr = np.asarray(src).astype(np.float32).copy()
        arr[950:, :, :] = 0.0
        lum = luminance(arr)

        # 字的 bounding box（亮度 > 25 的像素）
        ys, xs = np.where(lum > 25)
        if len(xs) == 0:
            raise SystemExit("字图里没找到任何亮字，阈值要调")
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        pad = 8
        x0 = max(0, x0 - pad)
        x1 = min(w, x1 + pad)
        y0 = max(0, y0 - pad)
        y1 = min(h, y1 + pad)

        # 裁出字块
        word_rgb = arr[y0:y1, x0:x1]
        word_lum = lum[y0:y1, x0:x1]

        # alpha：lum 10 以下透明，10~55 平滑过渡，55 以上不透明
        alpha = np.clip((word_lum - 10) / (55 - 10), 0, 1) * 255
        alpha = alpha.astype(np.uint8)

        rgba = np.dstack(
            [word_rgb.astype(np.uint8), alpha],
        )

        # 贴到 16:9 透明画布，水平居中，垂直略偏下（文字视觉重心）
        canvas = np.zeros((H, W, 4), dtype=np.uint8)
        cw, ch = word_rgb.shape[1], word_rgb.shape[0]
        # 目标字宽不超过画布的 86%，按比例缩
        max_w = int(W * 0.86)
        scale = 1.0
        if cw > max_w:
            scale = max_w / cw
            cw, ch = int(cw * scale), int(ch * scale)
            word_im = Image.fromarray(rgba, "RGBA").resize((cw, ch), Image.LANCZOS)
            rgba = np.asarray(word_im)
        tx = (W - cw) // 2
        ty = int(H * 0.5) - ch // 2 + int(H * 0.02)
        # 防越界
        tx = max(0, min(tx, W - cw))
        ty = max(0, min(ty, H - ch))
        canvas[ty : ty + ch, tx : tx + cw] = rgba

        Image.fromarray(canvas, "RGBA").save(OUT / "hero-word.png", "PNG")
    print(f"字图 ✓ hero-word.png {W}×{H} 字块 {x1-x0}×{y1-y0} 缩放 {scale:.2f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

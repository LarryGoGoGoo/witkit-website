# -*- coding: utf-8 -*-
"""把带人题材的高分图拼成 contact sheet，供人工判断亚洲面孔与题材匹配。"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "..", "图片海选")
SCORE = os.path.join(SRC, "score.json")
OUT = os.path.join(SRC, "contactsheets")
os.makedirs(OUT, exist_ok=True)

# 只看这几个带人的题材
CATS = ["meeting", "team", "office", "coding", "whiteboard", "brainstorm", "dev"]

def cat_of(name):
    return name.split("_", 1)[0]

def main():
    scores = json.load(open(SCORE, encoding="utf-8"))
    valid = [r for r in scores if r.get("score", -1) >= 0]
    by_cat = {}
    for r in valid:
        c = cat_of(r["file"])
        if c in CATS:
            by_cat.setdefault(c, []).append(r)
    for c in by_cat:
        by_cat[c].sort(key=lambda r: -r["score"])

    THUMB = 240
    COLS = 6

    for c in CATS:
        pool = by_cat.get(c, [])[:24]  # 每个题材取 top 24
        if not pool:
            continue
        rows = (len(pool) + COLS - 1) // COLS
        sheet = Image.new("RGB", (COLS * (THUMB + 6), rows * (THUMB + 6 + 24)), (30, 30, 30))
        d = ImageDraw.Draw(sheet)
        for i, r in enumerate(pool):
            p = os.path.join(SRC, r["file"])
            try:
                im = Image.open(p).convert("RGB")
                im.thumbnail((THUMB, THUMB))
            except Exception:
                continue
            x = (i % COLS) * (THUMB + 6)
            y = (i // COLS) * (THUMB + 6 + 24)
            sheet.paste(im, (x, y))
            label = f"{r['score']:.0f} {r['file'][:26]}"
            d.text((x + 2, y + THUMB + 4), label, fill=(230, 230, 230))
        out = os.path.join(OUT, f"{c}.png")
        sheet.save(out)
        print(f"{c}: {len(pool)} 张 -> {out}")

if __name__ == "__main__":
    main()

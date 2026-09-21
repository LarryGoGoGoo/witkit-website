# -*- coding: utf-8 -*-
"""按题材铺大图（分页，每页 12 张，脸看得清），供逐张目视核验面孔与场景。"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
OUT = os.path.join(SRC, "bigsheets")
os.makedirs(OUT, exist_ok=True)

CATS = ["meeting", "team", "office", "coding", "whiteboard", "brainstorm"]
THUMB, COLS, PER = 340, 3, 12


def main():
    scores = json.load(open(os.path.join(SRC, "score.json"), encoding="utf-8"))
    asian = json.load(open(os.path.join(SRC, "asian-ids.json"), encoding="utf-8"))
    by = {}
    for r in scores:
        if r.get("score", -1) < 0 or r["w"] <= r["h"]:
            continue
        try:
            pid = int(r["file"].split("_", 1)[1].split(".")[0])
        except ValueError:
            continue
        by[pid] = r

    for cat in CATS:
        pool = []
        for pid in asian.get(cat, []):
            r = by.get(int(pid))
            if r and r["file"].startswith(cat):
                pool.append(r)
        pool.sort(key=lambda r: r["file"])
        for page in range((len(pool) + PER - 1) // PER):
            chunk = pool[page * PER:(page + 1) * PER]
            cell_h = int(THUMB * 0.67)
            rows = (len(chunk) + COLS - 1) // COLS
            sheet = Image.new("RGB", (COLS * (THUMB + 8), rows * (cell_h + 8 + 22)), (20, 20, 24))
            d = ImageDraw.Draw(sheet)
            for i, r in enumerate(chunk):
                im = Image.open(os.path.join(SRC, r["file"])).convert("RGB")
                im.thumbnail((THUMB, cell_h))
                x = (i % COLS) * (THUMB + 8)
                y = (i // COLS) * (cell_h + 8 + 22)
                sheet.paste(im, (x, y))
                d.text((x + 4, y + cell_h + 4),
                       f"{r['file'][:-4]}  L{r['bright']:.0f}", fill=(235, 235, 235))
            out = os.path.join(OUT, f"{cat}-{page + 1}.png")
            sheet.save(out)
            print(f"{cat} 第{page + 1}页: {len(chunk)} 张 -> {out}")


if __name__ == "__main__":
    main()

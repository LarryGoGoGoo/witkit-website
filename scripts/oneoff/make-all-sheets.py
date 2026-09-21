# -*- coding: utf-8 -*-
"""
把「亚洲关键词白名单」里所有横版候选，按题材铺成拼图，供人工逐张目视筛选。
不做亮度过滤、不按分数截断 —— 这一轮就是要看到全池，避免盲选偏差。
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
OUT = os.path.join(SRC, "allsheets")
os.makedirs(OUT, exist_ok=True)

CATS = ["meeting", "team", "office", "coding", "whiteboard", "brainstorm"]


def main():
    scores = json.load(open(os.path.join(SRC, "score.json"), encoding="utf-8"))
    asian = json.load(open(os.path.join(SRC, "asian-ids.json"), encoding="utf-8"))

    by_id = {}
    for r in scores:
        if r.get("score", -1) < 0:
            continue
        if r["w"] <= r["h"]:            # 只要横版
            continue
        try:
            pid = int(r["file"].split("_", 1)[1].split(".")[0])
        except ValueError:
            continue
        by_id[pid] = r

    for cat in CATS:
        pool = []
        for pid in asian.get(cat, []):
            r = by_id.get(int(pid))
            if r:
                pool.append(r)
        pool.sort(key=lambda r: r["file"])

        THUMB, COLS = 240, 6
        rows = (len(pool) + COLS - 1) // COLS
        sheet = Image.new("RGB", (COLS * (THUMB + 6), rows * (THUMB + 6 + 22)), (24, 24, 28))
        d = ImageDraw.Draw(sheet)
        for i, r in enumerate(pool):
            p = os.path.join(SRC, r["file"])
            try:
                im = Image.open(p).convert("RGB")
                im.thumbnail((THUMB, THUMB))
            except Exception:
                continue
            x = (i % COLS) * (THUMB + 6)
            y = (i // COLS) * (THUMB + 6 + 22)
            sheet.paste(im, (x, y))
            d.text((x + 3, y + THUMB + 4),
                   f"L{r['bright']:.0f} {r['file'].split('_',1)[1].split('.')[0]}",
                   fill=(230, 230, 230))
        out = os.path.join(OUT, f"{cat}.png")
        sheet.save(out)
        print(f"{cat}: {len(pool)} 张 -> {out}")


if __name__ == "__main__":
    main()

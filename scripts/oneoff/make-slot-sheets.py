# -*- coding: utf-8 -*-
"""
为 6 个 about/ 照片位各生成一张「候选拼图」。
严格条件：白名单（亚洲关键词来源）+ 横版（照片位都是横版，竖图会被裁掉大半）
按位置语义分池、按亮度偏好排序，我（模型）看图后人工挑选。
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
SCORE = os.path.join(SRC, "score.json")
ASIAN = os.path.join(SRC, "asian-ids.json")
OUT = os.path.join(SRC, "slotsheets")
os.makedirs(OUT, exist_ok=True)

SLOTS = {
    "1-company":    (["office", "meeting"], "bright"),
    "2-vision":     (["whiteboard", "coding", "meeting", "team"], "bright"),
    "3-open":       (["meeting", "brainstorm", "team", "whiteboard"], "dark"),
    "4-inclusive":  (["team", "office", "brainstorm", "meeting"], "dark"),
    "5-sincere":    (["office", "coding", "brainstorm", "whiteboard"], "dark"),
    "6-passion":    (["coding", "team", "brainstorm", "office"], "dark"),
}

def main():
    scores = json.load(open(SCORE, encoding="utf-8"))
    asian = json.load(open(ASIAN, encoding="utf-8"))
    ok = set()
    for ids in asian.values():
        for i in ids:
            ok.add(int(i))

    by_id = {}
    for r in scores:
        if r.get("score", -1) < 0:
            continue
        if r["w"] <= r["h"]:          # 只要横版
            continue
        try:
            pid = int(r["file"].split("_", 1)[1].split(".")[0])
        except ValueError:
            continue
        if pid not in ok:
            continue
        r["_pid"] = pid
        by_id[pid] = r

    used = set()
    for slot, (cats, pref) in SLOTS.items():
        pool = []
        for c in cats:
            for pid in asian.get(c, []):
                r = by_id.get(pid)
                if r and pid not in used:
                    pool.append(r)
        # 去重
        seen, p2 = set(), []
        for r in pool:
            if r["_pid"] in seen:
                continue
            seen.add(r["_pid"]); p2.append(r)
        pool = p2

        if pref == "dark":
            pool = [r for r in pool if 40 <= r["bright"] <= 135]
        else:
            pool = [r for r in pool if r["bright"] > 125]

        pool.sort(key=lambda r: -r["score"])
        pool = pool[:20]

        THUMB, COLS = 250, 5
        rows = (len(pool) + COLS - 1) // COLS
        sheet = Image.new("RGB", (COLS * (THUMB + 8), rows * (THUMB + 8 + 26)), (28, 28, 32))
        d = ImageDraw.Draw(sheet)
        for i, r in enumerate(pool):
            p = os.path.join(SRC, r["file"])
            try:
                im = Image.open(p).convert("RGB")
                im.thumbnail((THUMB, THUMB))
            except Exception:
                continue
            x = (i % COLS) * (THUMB + 8)
            y = (i // COLS) * (THUMB + 8 + 26)
            sheet.paste(im, (x, y))
            d.text((x + 3, y + THUMB + 5), f"{r['score']:.0f} L{r['bright']:.0f} {r['file'][:24]}",
                   fill=(235, 235, 235))
        out = os.path.join(OUT, f"{slot}.png")
        sheet.save(out)
        print(f"{slot}  ({pref})  {len(pool)} 张候选 -> {out}")
        for r in pool:
            print(f"    {r['score']:>5.0f} L{r['bright']:>5.1f}  {r['file']}")

if __name__ == "__main__":
    main()

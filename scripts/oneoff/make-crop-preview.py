# -*- coding: utf-8 -*-
"""
按各位的实际比例裁切后的预览图 —— 看的就是「落到站点上会长什么样」。
用法：改 PICKS 后跑。
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
SPECS = os.path.join(BASE, "src/assets/imageSpecs.json")
OUT = os.path.join(BASE, "图片海选/croppreview")
os.makedirs(OUT, exist_ok=True)

PICKS = {
    "about/company": ["meeting_7644144", "team_7988520", "meeting_7644084"],
    "about/vision": ["whiteboard_7989095", "team_7988745", "meeting_7652049"],
    "about/value-open": ["brainstorm_8278897", "meeting_8278905", "brainstorm_8279210"],
    "about/value-inclusive": ["team_7652176", "meeting_8101931", "brainstorm_8101841"],
    "about/value-sincere": ["brainstorm_8279300", "brainstorm_7651545", "coding_7988125"],
    "about/value-passion": ["coding_8101731", "coding_8101975", "coding_36706459"],
}


def ratio_of(slot):
    data = json.load(open(SPECS, encoding="utf-8"))
    for s in data["slots"]:
        if s["slot"] == slot:
            r = (s.get("ratio") or "auto").replace(" ", "")
            if r in ("auto", ""):
                return 16 / 9
            if "/" in r:
                a, b = r.split("/", 1)
                return float(a) / float(b)
            return float(r)
    raise SystemExit(slot)


def crop_to(img, ratio):
    w, h = img.size
    if abs(w / h - ratio) < 0.005:
        return img
    if w / h > ratio:
        nw = int(round(h * ratio))
        left = (w - nw) // 2
        return img.crop((left, 0, left + nw, h))
    nh = int(round(w / ratio))
    top = (h - nh) // 2
    return img.crop((0, top, w, top + nh))


def main():
    W = 420
    rows = []
    for slot, names in PICKS.items():
        ratio = ratio_of(slot)
        for n in names:
            p = os.path.join(SRC, f"{n}.jpg")
            if not os.path.exists(p):
                continue
            im = crop_to(Image.open(p).convert("RGB"), ratio)
            im.thumbnail((W, 9999))
            rows.append((f"{slot}  {n}", im))
    cell_h = max(im.height for _, im in rows)
    COLS = 3
    R = (len(rows) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * (W + 10), R * (cell_h + 10 + 24)), (16, 16, 20))
    d = ImageDraw.Draw(sheet)
    for i, (tag, im) in enumerate(rows):
        x = (i % COLS) * (W + 10)
        y = (i // COLS) * (cell_h + 10 + 24)
        sheet.paste(im, (x, y))
        d.text((x + 5, y + cell_h + 5), tag, fill=(240, 240, 240))
    for pg in range(2):
        chunk = rows[pg * 9:(pg + 1) * 9]
        if not chunk:
            continue
        r2 = (len(chunk) + COLS - 1) // COLS
        s2 = Image.new("RGB", (COLS * (W + 10), r2 * (cell_h + 10 + 24)), (16, 16, 20))
        d2 = ImageDraw.Draw(s2)
        for i, (tag, im) in enumerate(chunk):
            x = (i % COLS) * (W + 10)
            y = (i // COLS) * (cell_h + 10 + 24)
            s2.paste(im, (x, y))
            d2.text((x + 5, y + cell_h + 5), tag, fill=(240, 240, 240))
        out = os.path.join(OUT, f"picks-{pg + 1}.png")
        s2.save(out)
        print("->", out, s2.size)


if __name__ == "__main__":
    main()

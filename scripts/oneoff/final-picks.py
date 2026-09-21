# -*- coding: utf-8 -*-
"""
终选：每个照片位 1 张主图（站点每格只用 1 张）。
按位的实际比例裁切后出预览图 —— 看的就是落到站点上会长什么样。
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
SPECS = os.path.join(BASE, "src/assets/imageSpecs.json")
OUT = os.path.join(BASE, "图片精配")
os.makedirs(OUT, exist_ok=True)

# 每个位：主选 + 2 备选。全部逐张看过画面后判定，主选排第一。
PICKS = {
    "about/company": (["meeting_7644144", "team_7988520", "meeting_7644084"],
                      "全员亚洲面孔、围桌讨论、明亮（L178）、构图留白干净"),
    "about/vision": (["team_7988745", "meeting_7652049", "whiteboard_7989095"],
                     "亚洲面孔结对看代码屏、明亮（L168），贴「技术愿景」"),
    "about/value-open": (["brainstorm_8279210", "brainstorm_8278897", "meeting_8278905"],
                         "深色（L98）适合压字、两人对话、全员亚洲"),
    "about/value-inclusive": (["team_7652176", "brainstorm_8101841", "meeting_8101931"],
                              "深色（L88）、四人各异、全员亚洲"),
    "about/value-sincere": (["brainstorm_8279300", "brainstorm_7651545", "coding_7988125"],
                            "深色（L97）、真实的逐条核对现场、全员亚洲"),
    "about/value-passion": (["coding_8101731", "coding_8101975", "coding_7988087"],
                            "深色（L86）、专注侧影、全员亚洲"),
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
    W, COLS = 400, 3
    rows = []
    for slot, (names, why) in PICKS.items():
        ratio = ratio_of(slot)
        ims = []
        for n in names:
            p = os.path.join(SRC, f"{n}.jpg")
            if not os.path.exists(p):
                print("  ! 缺图", n)
                continue
            im = crop_to(Image.open(p).convert("RGB"), ratio)
            im.thumbnail((W, 9999))
            ims.append((n, im))
        rows.append((slot, why, ims))

    cell_h = max(im.height for _, _, ims in rows for _, im in ims)
    R = len(rows)
    sheet = Image.new("RGB", (COLS * (W + 10), R * (cell_h + 10 + 46)), (16, 16, 20))
    d = ImageDraw.Draw(sheet)
    for r, (slot, why, ims) in enumerate(rows):
        for c, (n, im) in enumerate(ims):
            x = c * (W + 10)
            y = r * (cell_h + 10 + 46)
            sheet.paste(im, (x, y))
            tag = "★ " if c == 0 else "  备选 "
            d.text((x + 5, y + cell_h + 5), f"{tag}{slot} · {n}", fill=(245, 245, 245))
        d.text((5, r * (cell_h + 10 + 46) + cell_h + 24),
               f"主选理由：{why}", fill=(150, 190, 255))
    out = os.path.join(OUT, "_final-picks.png")
    sheet.save(out)
    print("->", out, sheet.size)
    for slot, (names, why) in PICKS.items():
        print(f"  {slot:<26} {names[0]}")


if __name__ == "__main__":
    main()

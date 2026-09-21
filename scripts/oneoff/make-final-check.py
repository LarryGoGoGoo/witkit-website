# -*- coding: utf-8 -*-
"""终选核对图：把每个位置的主选 + 备选拼成一张大图（560px，脸看得清）。"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
OUT = os.path.join(BASE, "图片精配")

FINAL = {
    "1-公司简介": ["meeting_7644144", "meeting_7644152", "team_7652136"],
    "2-愿景及使命": ["whiteboard_7989095", "team_7988745", "meeting_7652049"],
    "3-开放": ["brainstorm_8278897", "meeting_8278905", "brainstorm_8279210"],
    "4-包容": ["team_7651836", "meeting_8101931", "team_7652185"],
    "5-真诚": ["brainstorm_8279300", "brainstorm_7651545", "coding_7988087"],
    "6-热爱": ["coding_8101731", "coding_8101975", "coding_7988168"],
}

THUMB, COLS = 560, 3


def main():
    cell_h = int(THUMB * 0.66)
    rows = len(FINAL)
    sheet = Image.new("RGB", (COLS * (THUMB + 10), rows * (cell_h + 10 + 26)), (18, 18, 22))
    d = ImageDraw.Draw(sheet)
    for r, (slot, names) in enumerate(FINAL.items()):
        for c, n in enumerate(names):
            p = os.path.join(SRC, f"{n}.jpg")
            if not os.path.exists(p):
                continue
            im = Image.open(p).convert("RGB")
            im.thumbnail((THUMB, cell_h))
            x = c * (THUMB + 10)
            y = r * (cell_h + 10 + 26)
            sheet.paste(im, (x, y))
            tag = "★主选 " if c == 0 else f"备选{c} "
            d.text((x + 5, y + cell_h + 6), f"{tag}{slot}  {n}", fill=(240, 240, 240))
    out = os.path.join(OUT, "_final-check.png")
    sheet.save(out)
    print("->", out, sheet.size)


if __name__ == "__main__":
    main()

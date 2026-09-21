# -*- coding: utf-8 -*-
"""
把每个照片位的候选短名单铺成大图（缩略图 420px，脸看得清），供逐张目视核验。
用法：改 SHORTLIST 后直接跑。
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
OUT = os.path.join(SRC, "picksheets")
os.makedirs(OUT, exist_ok=True)

SHORTLIST = {
    "1-company": [
        "meeting_7652040", "team_7652050", "meeting_7644306", "team_7652136",
        "meeting_7644144", "meeting_7643748", "meeting_7644134", "meeting_7651745",
        "team_7652141", "team_7652129",
    ],
    "2-vision": [
        "team_7652129", "whiteboard_8101764", "whiteboard_8101915", "team_7652141",
        "meeting_7652044", "whiteboard_7652087", "team_7988750", "meeting_7651804",
        "whiteboard_7652040", "team_7652136",
    ],
    "3-open": [
        "meeting_8278905", "brainstorm_8278837", "team_8278898", "brainstorm_8279010",
        "brainstorm_8279020", "meeting_8279005", "team_7652176", "meeting_7651857",
        "meeting_8278921", "office_8682798",
    ],
    "4-inclusive": [
        "team_7651836", "brainstorm_7651573", "brainstorm_7651545", "team_7652193",
        "team_4623522", "team_4623543", "office_8101502", "team_7652145",
        "meeting_8279005", "meeting_8278921",
    ],
    "5-sincere": [
        "coding_7988113", "coding_7988125", "brainstorm_7651545", "brainstorm_8279300",
        "office_8682784", "coding_7988138", "coding_7988167", "coding_7988157",
        "meeting_8279010", "brainstorm_8279020",
    ],
    "6-passion": [
        "coding_8101975", "coding_8101877", "coding_8101731", "coding_7988168",
        "team_7988746", "coding_7988157", "coding_7504600", "team_7988820",
        "coding_7988113", "coding_7988167",
    ],
}

THUMB, COLS = 420, 3


def main():
    for slot, names in SHORTLIST.items():
        files = [f"{n}.jpg" for n in names]
        files = [f for f in files if os.path.exists(os.path.join(SRC, f))]
        rows = (len(files) + COLS - 1) // COLS
        cell_h = int(THUMB * 0.68)
        sheet = Image.new("RGB", (COLS * (THUMB + 8), rows * (cell_h + 8 + 24)), (22, 22, 26))
        d = ImageDraw.Draw(sheet)
        for i, f in enumerate(files):
            im = Image.open(os.path.join(SRC, f)).convert("RGB")
            im.thumbnail((THUMB, cell_h))
            x = (i % COLS) * (THUMB + 8)
            y = (i // COLS) * (cell_h + 8 + 24)
            sheet.paste(im, (x, y))
            d.text((x + 4, y + cell_h + 6), f[:-4], fill=(235, 235, 235))
        out = os.path.join(OUT, f"{slot}.png")
        sheet.save(out)
        print(f"{slot}: {len(files)} 张 -> {out}")


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""
最终精配（人工看图后选定）：6 个 about/ 照片位 × 3 张 = 18 张。
全部来自 asian/chinese 关键词白名单、全部横版（照片位是横版，竖图会被裁掉大半）。
挑选依据 = 我逐张看过 contact sheet / slotsheet 后按实际内容判定，不只看分数。
"""
import json
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
SCORE = os.path.join(SRC, "score.json")
DST = os.path.join(BASE, "图片精配")
if os.path.exists(DST):
    shutil.rmtree(DST)
os.makedirs(DST, exist_ok=True)

# 人工看图后选定。每位置 3 张，附「为什么选它」的说明（写进预览页，方便用户判断）
PICKS = {
    "1-公司简介": {
        "desc": "左字右图 · 明亮 · 要「人在做事、不是摆拍合影」",
        "files": [
            ("meeting_7644144.jpg", "会议室里几人围桌讨论，都是亚洲面孔，明亮、构图干净"),
            ("meeting_7643748.jpg", "长桌会议中发言的场景，全员亚洲面孔，明亮"),
            ("coding_7651629.jpg", "戴眼镜的开发者看着笔电微笑，单人专注，明亮"),
        ],
    },
    "2-愿景及使命": {
        "desc": "左字右图 · 明亮 · 要「白板讨论 / 结对编程 / 屏幕前的侧影」",
        "files": [
            ("whiteboard_8192251.jpg", "白板上写着英文句子的人 + 旁边听的人，典型的白板讨论现场"),
            ("team_7988750.jpg", "两人对着屏幕并肩协作，亚洲面孔，画面明亮"),
            ("meeting_7651804.jpg", "围着笔电一起看屏幕的一桌人，是「共同解决一个问题」的状态"),
        ],
    },
    "3-开放": {
        "desc": "整屏铺满 · 深色 · 要「公开讨论、白板上的分歧」",
        "files": [
            ("team_8278898.jpg", "长桌两侧多人讨论，像在把话摊开说，深色木调背景"),
            ("brainstorm_8278837.jpg", "两人对着纸本讨论、有肢体表达，色调偏深"),
            ("meeting_8278905.jpg", "两人隔桌对着文件交谈，深色调、全员亚洲面孔"),
        ],
    },
    "4-包容": {
        "desc": "整屏铺满 · 深色 · 要「各不相同的工作台、不同风格的人协作」",
        "files": [
            ("team_4623543.jpg", "戴头巾者与不同风格同事同桌协作 —— 这一条保留多样性，最贴「包容」语义"),
            ("team_7651836.jpg", "俯拍多人围着资料讨论，姿态各不相同，深色木桌"),
            ("brainstorm_7651573.jpg", "两人对着文件逐条讨论，深色调、亚洲面孔"),
        ],
    },
    "5-真诚": {
        "desc": "整屏铺满 · 深色 · 要「真实的工作台细节、被划掉重写的稿子」",
        "files": [
            ("brainstorm_8279300.jpg", "两人隔着柜台对着文件逐条核对，是真实的核对现场"),
            ("coding_7988125.jpg", "俯拍键盘上的手 + 屏幕，真实工作台细节，深色"),
            ("brainstorm_7651545.jpg", "两人对着屏幕讨论工作细节，深色调、亚洲面孔"),
        ],
    },
    "6-热爱": {
        "desc": "整屏铺满 · 深色 · 要「专注的侧影、屏幕前的深夜」",
        "files": [
            ("coding_36706459.jpg", "双屏前的开发者专注侧影，深色调，最贴「热爱」"),
            ("coding_8101975.jpg", "低头对着笔电专注工作，暗背景，屏幕光打在脸上"),
            ("team_7652180.jpg", "围桌对着屏幕工作的小团队，深色调、专注氛围"),
        ],
    },
}

def main():
    scores = json.load(open(SCORE, encoding="utf-8"))
    by_file = {r["file"]: r for r in scores if r.get("score", -1) >= 0}

    manifest = {"source": "pexels", "note": "亚洲面孔优先（asian/chinese 关键词来源）+ 横版 + 人工看图选定", "slots": {}}
    blocks = []
    total = 0

    for slot, cfg in PICKS.items():
        manifest["slots"][slot] = []
        cards = []
        for fname, why in cfg["files"]:
            r = by_file.get(fname)
            if not r:
                print(f"  ! 缺 {fname}")
                continue
            src = os.path.join(SRC, fname)
            outname = f"{slot}__{fname}"
            shutil.copy2(src, os.path.join(DST, outname))
            total += 1
            manifest["slots"][slot].append({
                "file": fname, "why": why,
                "score": r["score"], "bright": r["bright"],
                "w": r["w"], "h": r["h"],
            })
            cards.append(
                f'<figure class="card"><img src="{outname}" loading="lazy">'
                f'<figcaption><b>{fname}</b><br>{why}'
                f'<br><span class="s">{r["score"]:.0f}分 · 亮度{r["bright"]:.0f} · {r["w"]}×{r["h"]}</span>'
                f'</figcaption></figure>'
            )
        blocks.append(
            f'<section><h2>{slot}</h2><p class="d">{cfg["desc"]}</p>'
            f'<div class="grid">{"".join(cards)}</div></section>'
        )

    with open(os.path.join(DST, "selection.json"), "w", encoding="utf-8") as fp:
        json.dump(manifest, fp, ensure_ascii=False, indent=1)

    html = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>妙计科技 · 照片位精配（每位置 3 张）</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;padding:28px;background:#0f1115;color:#e6e8eb;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
h1{font-size:22px;margin:0 0 6px}
.sub{color:#9aa0a8;margin:0 0 26px;font-size:14px;line-height:1.7}
section{margin-bottom:40px}
h2{font-size:18px;margin:0 0 4px;color:#8fb8ff}
.d{color:#8b9199;font-size:13px;margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid #262b33}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{margin:0;border-radius:10px;overflow:hidden;background:#171b21}
.card img{width:100%;height:190px;object-fit:cover;display:block}
figcaption{padding:10px 12px;font-size:12px;color:#b8bdc4;line-height:1.65}
figcaption b{color:#e6e8eb}
.s{color:#4ade80;font-weight:600}
</style></head><body>
<h1>妙计科技 · 照片位精配</h1>
<p class="sub">6 个「关于我们」照片位 × 每位置 3 张 · 全部亚洲面孔关键词来源、全部横版<br>
挑选依据：我逐张看过实际画面后判定（不是只看分数）· 每张下面写了选它的理由</p>
__BODY__
</body></html>"""
    html = html.replace("__BODY__", "\n".join(blocks))
    with open(os.path.join(DST, "preview.html"), "w", encoding="utf-8") as fp:
        fp.write(html)

    print(f"精配完成：{total} 张 -> 图片精配/")

if __name__ == "__main__":
    main()

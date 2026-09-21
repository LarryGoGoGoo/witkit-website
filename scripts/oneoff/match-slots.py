# -*- coding: utf-8 -*-
"""
最终精配：6 个 about/ 照片位 × 每个 3 张候选。
- 严格只用 asian-ids.json 白名单里的 ID（这轮 asian/chinese 关键词搜出来的，保证亚洲面孔）
- value-* 四个企业文化位要求深色调（字压图上、留白字空间）→ 优先 bright 40~130
- company / vision 两位是左字右图、正常配图 → 优先明亮清晰
- 跨位置全局去重：同一张图只出现在一个位置
"""
import json
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
SCORE = os.path.join(SRC, "score.json")
ASIAN = os.path.join(SRC, "asian-ids.json")
DST = os.path.join(BASE, "图片精配")
if os.path.exists(DST):
    shutil.rmtree(DST)
os.makedirs(DST, exist_ok=True)

# 照片位 -> (亚洲白名单分类池, 亮度偏好)
SLOTS = {
    "about-company":    (["office"], "bright"),
    "about-vision":     (["team", "meeting", "whiteboard"], "bright"),
    "about-value-open": (["whiteboard", "brainstorm", "meeting"], "dark"),
    "about-value-inclusive": (["team", "office", "meeting"], "dark"),
    "about-value-sincere":   (["office", "coding", "whiteboard"], "dark"),
    "about-value-passion":   (["coding", "team", "brainstorm"], "dark"),
}

def cat_of(name):
    return name.split("_", 1)[0]

def main():
    scores = json.load(open(SCORE, encoding="utf-8"))
    asian = json.load(open(ASIAN, encoding="utf-8"))

    # 建立 id -> 分类 映射（白名单）
    asian_id_set = {}   # id -> 它属于哪些分类（一般一个）
    for c, ids in asian.items():
        for i in ids:
            asian_id_set.setdefault(int(i), set()).add(c)

    # 打分表按 id 索引
    score_by_id = {}
    for r in scores:
        if r.get("score", -1) < 0:
            continue
        fid = r["file"]
        pid = fid.split("_", 1)[1].split(".")[0]
        try:
            pid = int(pid)
        except ValueError:
            continue
        r["_pid"] = pid
        score_by_id[pid] = r

    used = set()   # 全局去重
    manifest = {"slots": {}}
    html_blocks = []

    for slot, (cats, pref) in SLOTS.items():
        # 候选：白名单这些分类里的 id，且有打分记录
        pool = []
        for c in cats:
            for pid in asian.get(c, []):
                r = score_by_id.get(pid)
                if r and pid not in used:
                    pool.append(r)
        # 去重（同 id 可能在多分类）
        seen = set()
        pool2 = []
        for r in pool:
            if r["_pid"] in seen:
                continue
            seen.add(r["_pid"])
            pool2.append(r)
        pool = pool2

        # 亮度偏好
        if pref == "dark":
            dark = [r for r in pool if 40 <= r["bright"] <= 130]
            chosen = dark if len(dark) >= 3 else pool
        else:
            bright = [r for r in pool if r["bright"] > 130]
            chosen = bright if len(bright) >= 3 else pool

        def key(r):
            if pref == "dark":
                bonus = 20 if 70 <= r["bright"] <= 120 else 0
                return (r["score"] + bonus, r["score"])
            return (r["score"],)

        chosen.sort(key=lambda r: (-key(r)[0], -r["score"]))
        top3 = chosen[:3]

        manifest["slots"][slot] = []
        for r in top3:
            used.add(r["_pid"])
            src = os.path.join(SRC, r["file"])
            dst = os.path.join(DST, f"{slot}__{r['file']}")
            shutil.copy2(src, dst)
            manifest["slots"][slot].append({
                "file": r["file"],
                "score": r["score"],
                "bright": r["bright"],
                "w": r.get("w"), "h": r.get("h"),
            })

        cards = "".join(
            f'<figure class="card"><img src="{f"{slot}__{r['file']}"}" loading="lazy">'
            f'<figcaption>{r["file"]}<br><span class="s">{r["score"]}分 · 亮度{r["bright"]:.0f}</span></figcaption></figure>'
            for r in top3
        )
        html_blocks.append(f'<section><h2>{slot} <span class="tag">{pref}</span></h2><div class="grid">{cards}</div></section>')

    with open(os.path.join(DST, "selection.json"), "w", encoding="utf-8") as fp:
        json.dump(manifest, fp, ensure_ascii=False, indent=1)

    html = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>妙计科技 · 6 个照片位精配候选（每位置 3 张）</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;padding:24px;background:#0f1115;color:#e6e8eb;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
h1{font-size:22px;margin:0 0 4px}
.sub{color:#9aa0a8;margin:0 0 24px;font-size:14px}
section{margin-bottom:36px}
h2{font-size:17px;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #262b33}
.tag{display:inline-block;margin-left:8px;padding:1px 8px;background:#1e2733;border-radius:10px;font-size:12px;color:#8fb8ff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.card{margin:0;border-radius:10px;overflow:hidden;background:#171b21}
.card img{width:100%;height:180px;object-fit:cover;display:block}
figcaption{padding:8px 10px;font-size:12px;color:#b8bdc4;word-break:break-all;line-height:1.5}
.s{color:#4ade80;font-weight:600}
</style></head><body>
<h1>妙计科技 · 照片位精配候选</h1>
<p class="sub">6 个 about/ 位 × 3 张 · 全部来自 asian/chinese 关键词（亚洲面孔）· value-* 位深色、company/vision 明亮 · 跨位置不重复</p>
__BODY__
</body></html>"""
    html = html.replace("__BODY__", "\n".join(html_blocks))
    with open(os.path.join(DST, "preview.html"), "w", encoding="utf-8") as fp:
        fp.write(html)

    print("精配完成，输出到 图片精配/：")
    for slot, arr in manifest["slots"].items():
        print(f"  {slot}: {len(arr)} 张")
        for a in arr:
            print(f"      - {a['file']}  ({a['score']}分 亮度{a['bright']:.0f})")

if __name__ == "__main__":
    main()

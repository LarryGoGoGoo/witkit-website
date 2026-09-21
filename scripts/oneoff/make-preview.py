# -*- coding: utf-8 -*-
"""生成 图片精选/ 的 HTML 预览页，按题材分组、缩略图网格展示"""
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
DST = os.path.join(ROOT, "..", "图片精选")
SEL = os.path.join(DST, "selection.json")

CAT_CN = {
    "tech": "科技", "office": "办公", "meeting": "会议", "dev": "开发",
    "datacenter": "数据中心", "team": "团队", "city": "城市", "design": "设计",
    "security": "安全", "cloud": "云计算", "server": "服务器", "circuit": "电路",
    "abstract": "抽象科技", "network": "网络",
}

def main():
    data = json.load(open(SEL, encoding="utf-8"))
    by_cat = data["by_category"]
    sel_map = {s["file"]: s for s in data["selected"]}

    items = []
    for c in sorted(by_cat, key=lambda c: CAT_CN.get(c, c)):
        cn = CAT_CN.get(c, c)
        files = by_cat[c]
        cards = []
        for f in files:
            s = sel_map[f]
            cards.append(
                f'<figure class="card" title="{f} · 评分 {s["score"]} · {s["w"]}x{s["h"]}">'
                f'<img src="{f}" loading="lazy" alt="{f}">'
                f'<figcaption>{f}<br><span class="score">{s["score"]}分</span></figcaption>'
                f'</figure>'
            )
        items.append(
            f'<section><h2>{cn} <span class="cnt">{len(files)}</span></h2>'
            f'<div class="grid">{"".join(cards)}</div></section>'
        )

    html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>妙计科技官网 · 图片精选（200 张）</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px; background: #0f1115; color: #e6e8eb;
    font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .sub { color: #9aa0a8; margin: 0 0 24px; font-size: 14px; }
  section { margin-bottom: 40px; }
  h2 {
    font-size: 18px; margin: 0 0 14px; padding-bottom: 8px;
    border-bottom: 1px solid #262b33;
  }
  h2 .cnt {
    display: inline-block; margin-left: 6px; padding: 1px 8px;
    background: #1e2733; border-radius: 10px; font-size: 12px; color: #8fb8ff;
  }
  .grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }
  .card { margin: 0; border-radius: 10px; overflow: hidden; background: #171b21; }
  .card img { width: 100%; height: 130px; object-fit: cover; display: block; }
  figcaption {
    padding: 8px 10px; font-size: 12px; color: #b8bdc4; line-height: 1.5;
    word-break: break-all;
  }
  figcaption .score { color: #4ade80; font-weight: 600; }
</style>
</head>
<body>
<h1>妙计科技官网 · 图片精选</h1>
<p class="sub">共 __TOTAL__ 张 · 按题材分组 · 鼠标悬停看文件名/评分/尺寸 · 双击大图可右键保存</p>
__BODY__
</body>
</html>
"""
    html = html.replace("__TOTAL__", str(len(data["selected"]))).replace("__BODY__", "\n".join(items))

    out = os.path.join(DST, "preview.html")
    with open(out, "w", encoding="utf-8") as fp:
        fp.write(html)
    print("已生成", out)

if __name__ == "__main__":
    main()

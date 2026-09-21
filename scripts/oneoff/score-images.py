# -*- coding: utf-8 -*-
"""
对 图片海选/ 里的每张图做客观质量打分，输出 score.json
评分维度：
  1. 分辨率（宽 x 高）：太小直接扣分/淘汰
  2. 文件大小：太小说明压缩过度或损坏
  3. 锐度：拉普拉斯方差（越大越清晰）
  4. 亮度：过暗/过亮都扣分
  5. 色彩多样性：灰度过低（可能纯色图）提示
"""
import json
import os
from PIL import Image, ImageFilter, ImageStat

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "图片海选")
OUT = os.path.join(SRC, "score.json")

MIN_W = 1000          # 宽度下限
MIN_BYTES = 25000     # 文件大小下限（25KB）

def analyze(path):
    name = os.path.basename(path)
    size = os.path.getsize(path)
    try:
        img = Image.open(path)
        img.load()
        w, h = img.size
        # 灰度锐度
        g = img.convert("L")
        lap = g.filter(ImageFilter.FIND_EDGES)
        stat = ImageStat.Stat(lap)
        sharp = stat.stddev[0]  # 边缘标准差 = 锐度代理
        # 亮度
        bstat = ImageStat.Stat(g)
        bright = bstat.mean[0]
        # 色彩多样性（RGB 各通道标准差）
        rgb_stat = ImageStat.Stat(img.convert("RGB"))
        color_std = sum(rgb_stat.stddev) / 3.0
    except Exception as e:
        return {"file": name, "error": str(e), "score": -1}

    # 打分（0~100）
    score = 0.0
    # 分辨率：>=1600 满分，1200~1600 部分
    if w >= 1600:
        score += 30
    elif w >= 1200:
        score += 22
    elif w >= MIN_W:
        score += 10
    else:
        score -= 40  # 太小，基本淘汰
    # 文件大小：>=200KB 满分，50~200 部分
    if size >= 200000:
        score += 15
    elif size >= 100000:
        score += 11
    elif size >= MIN_BYTES:
        score += 5
    else:
        score -= 30
    # 锐度：stddev 越高越清晰
    if sharp >= 60:
        score += 30
    elif sharp >= 35:
        score += 24
    elif sharp >= 18:
        score += 15
    elif sharp >= 10:
        score += 8
    else:
        score += 2
    # 亮度：60~200 理想
    if 60 <= bright <= 200:
        score += 15
    elif 40 <= bright <= 225:
        score += 8
    else:
        score += 0  # 过暗/过曝
    # 色彩
    if color_std >= 30:
        score += 10
    elif color_std >= 15:
        score += 6
    else:
        score += 2

    return {
        "file": name,
        "w": w, "h": h,
        "bytes": size,
        "sharp": round(sharp, 1),
        "bright": round(bright, 1),
        "color_std": round(color_std, 1),
        "score": round(score, 1),
    }

def main():
    results = []
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")))
    for f in files:
        r = analyze(os.path.join(SRC, f))
        results.append(r)
        print(f"{r.get('score', -1):>6}  {f}  {r.get('w','?')}x{r.get('h','?')}  {r.get('sharp','?')}")

    with open(OUT, "w", encoding="utf-8") as fp:
        json.dump(results, fp, ensure_ascii=False, indent=1)

    scores = [r["score"] for r in results if r["score"] >= 0]
    print(f"\n共 {len(results)} 张，有效 {len(scores)} 张")
    if scores:
        print(f"平均分 {sum(scores)/len(scores):.1f}，最高 {max(scores):.1f}，最低 {min(scores):.1f}")
    print(f"结果已写入 {OUT}")

if __name__ == "__main__":
    main()

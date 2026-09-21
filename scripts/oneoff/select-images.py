# -*- coding: utf-8 -*-
"""
从 图片海选/ 精选 ~200 张，按题材均匀配额，复制到 图片精选/
策略：14 个题材每个先取 14 张最高分（保题材多样性），
      剩余名额用全局最高分补齐，凑满 200。
"""
import json
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ROOT, "..")
SRC = os.path.join(BASE, "图片海选")
DST = os.path.join(BASE, "图片精选")
SCORE = os.path.join(SRC, "score.json")

TARGET = 200

def cat_of(filename):
    return filename.split("_", 1)[0]

def main():
    scores = json.load(open(SCORE, encoding="utf-8"))
    # 只保留有效评分，且文件确实存在
    valid = []
    for r in scores:
        if r.get("score", -1) < 0:
            continue
        p = os.path.join(SRC, r["file"])
        if not os.path.exists(p):
            continue
        r["_cat"] = cat_of(r["file"])
        valid.append(r)

    # 按题材分组
    cats = {}
    for r in valid:
        cats.setdefault(r["_cat"], []).append(r)
    for c in cats:
        cats[c].sort(key=lambda r: -r["score"])

    cat_names = sorted(cats.keys())
    n_cat = len(cat_names)
    base = TARGET // n_cat          # 每题材基础配额
    remainder = TARGET % n_cat      # 剩余名额（给分数最高题材优先）

    selected = []
    remaining_pool = []

    # 每题材取 base 张
    for c in cat_names:
        pool = cats[c]
        take = base
        for r in pool[:take]:
            selected.append(r)
        # 余下的进全局候选池（用于补满名额）
        remaining_pool.extend(pool[take:])

    # 剩余名额：全局最高分补齐
    remaining_pool.sort(key=lambda r: -r["score"])
    selected.extend(remaining_pool[:remainder])

    # 去重（按文件名，防止 server/datacenter 等重复 id 跨题材）
    seen = set()
    final = []
    for r in selected:
        if r["file"] in seen:
            continue
        seen.add(r["file"])
        final.append(r)

    # 若仍不足 200（去重导致），继续从剩余池补
    if len(final) < TARGET:
        pool = [r for r in remaining_pool if r["file"] not in seen]
        pool.sort(key=lambda r: -r["score"])
        for r in pool:
            if len(final) >= TARGET:
                break
            if r["file"] in seen:
                continue
            seen.add(r["file"])
            final.append(r)

    final.sort(key=lambda r: -r["score"])

    # 复制
    if os.path.exists(DST):
        shutil.rmtree(DST)
    os.makedirs(DST, exist_ok=True)

    manifest = {"source": "pexels", "selected": [], "by_category": {}}
    for r in final:
        src = os.path.join(SRC, r["file"])
        dst = os.path.join(DST, r["file"])
        shutil.copy2(src, dst)
        manifest["selected"].append({
            "file": r["file"],
            "score": r["score"],
            "w": r.get("w"), "h": r.get("h"),
        })
        c = r["_cat"]
        manifest["by_category"].setdefault(c, []).append(r["file"])

    with open(os.path.join(DST, "selection.json"), "w", encoding="utf-8") as fp:
        json.dump(manifest, fp, ensure_ascii=False, indent=1)

    # 打印汇总
    print(f"精选 {len(final)} 张，已复制到 图片精选/")
    for c in sorted(manifest["by_category"]):
        print(f"  {c:<12} {len(manifest['by_category'][c])} 张")

if __name__ == "__main__":
    main()

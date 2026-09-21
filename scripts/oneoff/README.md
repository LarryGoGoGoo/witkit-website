# oneoff · 一次性过程脚本

这里是**做图过程中用过的一次性工具**，不是日常构建/检查链的一部分。

## 为什么单独放

根 `scripts/` 只留每天会跑的东西（`check:*`、`build-i18n`、`witkit-*-check`）。
下面这些是当初「从图库几百张里挑图 → 裁切 → 落位」时写的脚本，
跑完一轮就完成了使命。留在根目录会让人误以为要维护。

## 注意：这些脚本当前**跑不起来**

它们依赖的输入目录 `图片海选/`（334 张原图）、`图片精选/`（200 张筛选结果）、
`图片素材候选/` 等**没有进仓库**（体积大，见根 `.gitignore`）。

要重跑其中任何一个，得先自己准备素材目录，再按脚本里的路径常量对齐。

## 它们记录了什么

选图流程本身写在根目录 `图片选用记录.md` 里（每个图片位用了哪张图、从哪来、为什么选它）。
这些脚本是那个流程的实现细节——想知道「当初怎么筛的」再来看。

## 文件分类

| 前缀 | 做什么 |
|---|---|
| `download-images.mjs` / `probe-pexels.mjs` | 从 Pexels 拉候选图 |
| `score-images.py` / `select-images.py` / `final-picks.py` | 客观打分、按题材配额筛选 |
| `make-*-sheets.py` / `make-preview.py` / `contact-sheet.py` | 生成接触印相图（人工目视复核用） |
| `match-slots.py` / `set-slot-image.py` / `finalize-slots.py` | 把选中的图落到 `src/assets/imageSpecs.json` 对应的图片位 |
| `prepare-logo.py` / `process-hero-split.py` / `add-asian-ids.mjs` | 单个素材的后处理 |
| `hero-anim-shot.mjs` / `shots-hero-final.mjs` | 首屏动画的临时截图 |

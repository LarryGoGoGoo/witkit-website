"""把用户给的 logo 原图处理成两个站内资产。

只做两件纯技术的事，不碰设计：
1) 裁掉四周白边（原图 1923×817 四周留白很大，直接按高度渲染会显得 logo 很小）
2) 生成深色底用的反白版（页脚是深色），做法是把白底去掉、笔画映射成白色

颜色本身从原图像素直接取，不做任何调色。
"""
from PIL import Image

SRC = r"C:\Users\larry\WorkBuddy\2026-09-16-22-11-22\witkit-website\src\assets\images\logo-witkit.png"
INV = r"C:\Users\larry\WorkBuddy\2026-09-16-22-11-22\witkit-website\src\assets\images\logo-witkit-inverse.png"

im = Image.open(SRC).convert("RGB")
w, h = im.size
px = im.load()
print("原始尺寸", w, h)
print("四角像素", px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1])

# 1) 找内容边界：非白像素（阈值 245，容忍轻微噪点和压缩痕迹）
THRESH = 245
left, top, right, bottom = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if r < THRESH or g < THRESH or b < THRESH:
            if x < left:
                left = x
            if x > right:
                right = x
            if y < top:
                top = y
            if y > bottom:
                bottom = y

PAD = 6
left = max(0, left - PAD)
top = max(0, top - PAD)
right = min(w - 1, right + PAD)
bottom = min(h - 1, bottom + PAD)
print("内容边界", left, top, right, bottom)

box = (left, top, right + 1, bottom + 1)
cropped = im.crop(box)

# 顶栏 logo 显示高度 40px，这里留 3 倍余量足够视网膜屏，也把文件压小
TARGET_H = 120
target_w = round(cropped.size[0] * TARGET_H / cropped.size[1])
cropped = cropped.resize((target_w, TARGET_H), Image.LANCZOS)
print("裁切+缩放后", cropped.size, "宽高比", round(cropped.size[0] / cropped.size[1], 3))
cropped.save(SRC, optimize=True)
print("已写回 logo-witkit.png（保留白底，颜色不动）")

# 2) 反白版：alpha 由「离白多远」决定，笔画统一映射成纯白
#    归一化到 m<=90 即不透明，保证笔画核心是纯白而不是灰白
cw, ch = cropped.size
cp = cropped.load()

inv = Image.new("RGBA", (cw, ch), (255, 255, 255, 0))
ip = inv.load()
FULL_AT = 90
for y in range(ch):
    for x in range(cw):
        r, g, b = cp[x, y]
        m = min(r, g, b)
        a = int(round((255 - m) * 255 / (255 - FULL_AT)))
        ip[x, y] = (255, 255, 255, max(0, min(255, a)))
inv.save(INV, optimize=True)
print("已生成 logo-witkit-inverse.png（白字透明底）")

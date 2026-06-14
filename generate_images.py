#!/usr/bin/env python3
"""
generate_images.py — FXコンパスのブランド画像をオリジナル生成（ライセンス問題なし）

生成物（images/ に出力。dist には含まれる＝公開対象。本スクリプトは publish.py が dist から除外）:
  - og-default.png          1200x630  OGP/Twitterカード用の既定画像
  - favicon-32.png          32x32     ファビコン
  - apple-touch-icon.png    180x180   iOSホーム追加アイコン
  - favicon.svg                       ベクタファビコン（対応ブラウザ用）
  - banner-*.png            1040x420  カテゴリ帯/カードサムネ用の designed バナー（写真でなく自作グラフィック）

方針: ストック写真は使わない（ライセンス・出所・品質リスク）。ブランド配色の
  オリジナル・グラフィックで「designed感」を出す。日本語はヒラギノ（ローカル）で描画。
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "images")
os.makedirs(OUT, exist_ok=True)

# ---- フォント（macOS ローカル・ヒラギノ） ----
F_BLACK = "/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc"
F_BOLD = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"
F_MED = "/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc"


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def hx(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))


NAVY = hx("#1a2350")
NAVY2 = hx("#2a2f6b")
BLUE = hx("#2f6bed")
VIOLET = hx("#7b3ff2")
SKY = hx("#8ab4ff")
LILAC = hx("#c4a3ff")
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def diagonal_gradient(w, h, c1, c2):
    """左上→右下の対角グラデーション（軽量実装）。"""
    base = Image.new("RGB", (w, h), c1)
    px = base.load()
    for y in range(h):
        for x in range(0, w, 2):  # 2pxおき（高速化）。隣にコピー
            t = (x / w + y / h) / 2
            c = lerp(c1, c2, t)
            px[x, y] = c
            if x + 1 < w:
                px[x + 1, y] = c
    return base


def add_dot_grid(img, color, step=34, r=1, alpha=26):
    """うっすらドットグリッド（テック感）。"""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for y in range(step, img.height, step):
        for x in range(step, img.width, step):
            d.ellipse([x - r, y - r, x + r, y + r], fill=color + (alpha,))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))


def chart_polyline(img, box, color, width=6, fill_alpha=40, seed=7):
    """上昇トレンド風のなめらかな折れ線＋淡いエリア塗り。"""
    x0, y0, x1, y1 = box
    n = 9
    import random
    random.seed(seed)
    pts = []
    val = 0.18
    for i in range(n):
        val = min(0.96, max(0.08, val + random.uniform(-0.08, 0.20)))
        x = x0 + (x1 - x0) * i / (n - 1)
        y = y1 - (y1 - y0) * val
        pts.append((x, y))
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    area = pts + [(x1, y1), (x0, y1)]
    d.polygon(area, fill=color + (fill_alpha,))
    d.line(pts, fill=color + (255,), width=width, joint="curve")
    for p in pts:
        d.ellipse([p[0] - width, p[1] - width, p[0] + width, p[1] + width], fill=WHITE + (255,))
        d.ellipse([p[0] - width + 2, p[1] - width + 2, p[0] + width - 2, p[1] + width - 2], fill=color + (255,))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))


def compass(draw, cx, cy, r, ring=BLUE, light=False):
    """方位磁針マーク。"""
    ringc = WHITE if light else ring
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ringc, width=max(3, r // 14))
    # 針
    draw.polygon([(cx, cy - r * 0.62), (cx + r * 0.2, cy), (cx, cy - r * 0.1), (cx - r * 0.2, cy)],
                 fill=hx("#e5484d"))
    draw.polygon([(cx, cy + r * 0.62), (cx - r * 0.2, cy), (cx, cy + r * 0.1), (cx + r * 0.2, cy)],
                 fill=(SKY if light else hx("#41507f")))
    draw.ellipse([cx - r * 0.09, cy - r * 0.09, cx + r * 0.09, cy + r * 0.09], fill=WHITE if light else NAVY)


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0], img.size[1]], radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


# =========================================================================
# 1) OG画像 1200x630
# =========================================================================
def make_og():
    W, H = 1200, 630
    img = diagonal_gradient(W, H, NAVY, NAVY2)
    add_dot_grid(img, SKY, step=38, alpha=22)
    chart_polyline(img, (72, 400, W - 72, 560), SKY, width=7, fill_alpha=24, seed=11)
    d = ImageDraw.Draw(img)
    compass(d, W - 150, 150, 92, light=True)
    d.text((72, 118), "FXコンパス", font=font(F_BLACK, 104), fill=WHITE)
    d.text((76, 250), "FXの、迷わない地図。", font=font(F_BOLD, 46), fill=SKY)
    d.text((76, 322), "始め方・口座比較・取引ツール・税金・プロップ", font=font(F_MED, 30), fill=hx("#c8d0ee"))
    # 下部のPRバー的ライン
    d.rectangle([0, H - 10, W, H], fill=BLUE)
    img.save(os.path.join(OUT, "og-default.png"), "PNG")


# =========================================================================
# 2) ファビコン
# =========================================================================
def make_favicon():
    for size, name in [(180, "apple-touch-icon.png"), (32, "favicon-32.png")]:
        s = size * 4
        img = diagonal_gradient(s, s, BLUE, VIOLET)
        d = ImageDraw.Draw(img)
        compass(d, s // 2, s // 2, int(s * 0.34), light=True)
        img = rounded(img, int(s * 0.22))
        img = img.resize((size, size), Image.LANCZOS)
        img.save(os.path.join(OUT, name), "PNG")
    # SVG favicon
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#2f6bed"/><stop offset="1" stop-color="#7b3ff2"/></linearGradient></defs>'
        '<rect width="64" height="64" rx="14" fill="url(#g)"/>'
        '<circle cx="32" cy="32" r="18" fill="none" stroke="#fff" stroke-width="3"/>'
        '<polygon points="32,18 37,32 32,29 27,32" fill="#e5484d"/>'
        '<polygon points="32,46 27,32 32,35 37,32" fill="#cdd7ff"/>'
        '<circle cx="32" cy="32" r="2.6" fill="#fff"/></svg>'
    )
    with open(os.path.join(OUT, "favicon.svg"), "w", encoding="utf-8") as f:
        f.write(svg)


# =========================================================================
# 3) カテゴリ帯バナー（カードサムネ用・designedグラフィック）
# =========================================================================
CATS = [
    ("hajimete", "はじめてのFX", hx("#10b3a3"), hx("#2f6bed")),
    ("kouza", "FX口座 比較", hx("#2f6bed"), hx("#5566e8")),
    ("vps", "VPS・取引環境", hx("#0e9f8e"), hx("#2f6bed")),
    ("chart", "チャートツール", hx("#3b5bdb"), hx("#7b3ff2")),
    ("prop", "プロップファーム", hx("#7b3ff2"), hx("#d6409f")),
    ("zeikin", "税金・確定申告", hx("#e8902a"), hx("#e5556f")),
    ("tool", "無料ツール", hx("#7b3ff2"), hx("#2f6bed")),
]


def make_banner(key, label, c1, c2):
    W, H = 1040, 420
    img = diagonal_gradient(W, H, c1, c2)
    add_dot_grid(img, WHITE, step=40, alpha=18)
    chart_polyline(img, (60, 150, W - 60, 330), WHITE, width=6, fill_alpha=26, seed=hash(key) % 97)
    d = ImageDraw.Draw(img)
    compass(d, W - 130, 120, 70, light=True)
    # ラベル（左下）
    d.text((56, H - 96), label, font=font(F_BLACK, 60), fill=WHITE)
    d.rectangle([56, H - 30, 56 + 120, H - 22], fill=WHITE)
    img.save(os.path.join(OUT, f"banner-{key}.png"), "PNG")


def main():
    make_og()
    make_favicon()
    for key, label, c1, c2 in CATS:
        make_banner(key, label, c1, c2)
    files = sorted(os.listdir(OUT))
    print("generated:", ", ".join(files))


if __name__ == "__main__":
    main()

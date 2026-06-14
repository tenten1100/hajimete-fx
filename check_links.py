#!/usr/bin/env python3
"""check_links.py — プロップナビ 内部リンク / sitemap / 禁止文言の自動検証

実行: python3 sites/prop-navi/check_links.py
（リポジトリ直下からでも、sites/prop-navi/ 直下からでも動くよう自分の位置基準で探索する）

検証内容:
  1. 全HTMLの内部リンク（href / src）が実在ファイルを指すか
  2. sitemap.xml に記載した全URLが実在ファイルに対応するか
  3. 禁止文言（売買助言・成果保証ワード）が本文に0件か
  4. 外部script src（http(s)://）を読み込んでいないか（依存ゼロ方針）

終了コード: 問題があれば 1、なければ 0。
"""
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.abspath(__file__))

# 公開時のベースURL。links.js の site.baseUrl から読む（単一管理）。読めなければプレースホルダ。
def _read_base_url():
    links_js = os.path.join(ROOT, "assets", "links.js")
    try:
        with open(links_js, encoding="utf-8") as f:
            m = re.search(r'baseUrl:\s*"([^"]+)"', f.read())
            if m:
                return m.group(1).rstrip("/")
    except OSError:
        pass
    return "https://example.github.io/prop-navi"

BASE_URL = _read_base_url()

# 本文に出てはいけない文言（売買助言・成果保証。R1ハード条件）。
FORBIDDEN = ["買え", "売れ", "必ず勝て", "必ず勝つ", "確実に勝て", "確実に合格", "絶対に勝て", "絶対に儲か", "今が買い時", "今が売り時"]


class LinkParser(HTMLParser):
    """href/src を集める。外部URL・アンカー・mailto等は別枠に。"""
    def __init__(self):
        super().__init__()
        self.local_links = []   # ローカル相対リンク（ファイル#anchor 含む）
        self.external = []      # http(s):// のリンク
        self.script_external = []  # <script src=http...>（依存ゼロ違反）

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for attr in ("href", "src"):
            val = d.get(attr)
            if not val:
                continue
            if val.startswith("#") or val.startswith("mailto:") or val.startswith("data:"):
                continue
            if val.startswith("http://") or val.startswith("https://"):
                self.external.append(val)
                if tag == "script" and attr == "src":
                    self.script_external.append(val)
            else:
                self.local_links.append((tag, attr, val))


def html_files():
    out = []
    for dirpath, _dirs, files in os.walk(ROOT):
        for f in files:
            if f.endswith(".html"):
                out.append(os.path.join(dirpath, f))
    return sorted(out)


def strip_tags(html):
    # script/style ブロックを丸ごと除去してから本文テキストだけ残す（禁止文言は本文判定）。
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.IGNORECASE)
    html = re.sub(r"<[^>]+>", " ", html)
    return html


def check_internal_links():
    problems = []
    for path in html_files():
        with open(path, encoding="utf-8") as fh:
            content = fh.read()
        p = LinkParser()
        p.feed(content)
        base_dir = os.path.dirname(path)
        for tag, attr, val in p.local_links:
            # アンカー(#…)とクエリ文字列(?v=… 等のキャッシュ破棄)を除いて実ファイルを判定する。
            target = val.split("#", 1)[0].split("?", 1)[0]
            if target == "":
                continue  # 同ページ内アンカーのみ
            resolved = os.path.normpath(os.path.join(base_dir, target))
            if not os.path.exists(resolved):
                problems.append(f"  [リンク切れ] {rel(path)} の {tag}@{attr}=\"{val}\" → {rel(resolved)} が存在しない")
        for s in p.script_external:
            problems.append(f"  [外部script] {rel(path)} が外部スクリプトを読み込んでいる: {s}")
    return problems


def check_sitemap():
    problems = []
    sm = os.path.join(ROOT, "sitemap.xml")
    if not os.path.exists(sm):
        return ["  [sitemap] sitemap.xml が存在しない"]
    with open(sm, encoding="utf-8") as fh:
        content = fh.read()
    locs = re.findall(r"<loc>(.*?)</loc>", content)
    if not locs:
        problems.append("  [sitemap] <loc> が1件も無い")
    for loc in locs:
        if not loc.startswith(BASE_URL):
            problems.append(f"  [sitemap] ベースURL不一致: {loc}")
            continue
        relpath = loc[len(BASE_URL):].lstrip("/")
        resolved = os.path.normpath(os.path.join(ROOT, relpath))
        if not os.path.exists(resolved):
            problems.append(f"  [sitemap] 記載URLの実体が無い: {loc} → {rel(resolved)}")
    # 逆方向: 全HTMLがsitemapに載っているか（任意・警告）。
    listed = set(loc[len(BASE_URL):].lstrip("/") for loc in locs if loc.startswith(BASE_URL))
    for path in html_files():
        relp = os.path.relpath(path, ROOT)
        if relp not in listed:
            problems.append(f"  [sitemap-warn] sitemap未掲載のHTML: {relp}")
    return problems


def check_forbidden():
    problems = []
    for path in html_files():
        with open(path, encoding="utf-8") as fh:
            text = strip_tags(fh.read())
        for word in FORBIDDEN:
            if word in text:
                problems.append(f"  [禁止文言] {rel(path)} に「{word}」")
    return problems


def rel(path):
    return os.path.relpath(path, ROOT)


def main():
    sections = [
        ("内部リンク / 外部script", check_internal_links()),
        ("sitemap", check_sitemap()),
        ("禁止文言", check_forbidden()),
    ]
    # sitemap-warn は警告扱い（失敗にしない）。それ以外は失敗。
    hard_fail = 0
    print("=== プロップナビ リンク・文言チェック ===")
    for name, problems in sections:
        if not problems:
            print(f"[OK] {name}: 問題なし")
            continue
        for pr in problems:
            print(pr)
            if "[sitemap-warn]" not in pr:
                hard_fail += 1
    if hard_fail:
        print(f"\n結果: NG（致命的な問題 {hard_fail} 件）")
        return 1
    print("\n結果: OK（致命的な問題なし）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

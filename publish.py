#!/usr/bin/env python3
"""
publish.py — プロップナビ公開準備の自動化（初心者向け・1コマンド）

やること:
  1. 質問に答えてもらう（GitHubユーザー名・リポジトリ名・各アフィリURL等。2回目以降は保存済み設定を再利用）
     - アフィリ枠は links.js の affiliates を動的に読んで順に聞く（枠を増減してもこのスクリプトは無修正）。
     - 旧 "ftmo"/"fintokei" の保存値はキー名が一致するため新形式でもそのまま引き継がれる。
  2. アップロード用フォルダ dist/ を生成
     - ベースURL（canonical / og:url / JSON-LD / sitemap / robots）を実URLへ一括置換
     - links.js に各アフィリURL・noteURL・更新日を投入
     - about.html に運営者ハンドル・連絡先を反映（任意）
     - 公開不要ファイル（運用書・テスト・本スクリプト）を除外
  3. 生成結果を自動検証（リンク切れ・禁止文言・置換漏れ）
  4. 次にやることを画面に表示

使い方:
  python3 publish.py                 # 対話モード（推奨）
  python3 publish.py --reset        # 保存済み設定を破棄して最初から
  python3 publish.py --user taro --repo prop-navi --ftmo https://... 等の引数指定も可
  python3 publish.py --affiliate conoha=https://... --affiliate dmmfx=https://...  # 任意の枠を引数で

このスクリプトは sites/prop-navi/ の元ファイルを変更しない（dist/ だけを作る）。
記事を直した後はもう一度実行すれば dist/ が作り直される。
"""

import argparse
import datetime
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
CONFIG_PATH = ROOT / "publish_config.json"
LINKS_JS = ROOT / "assets" / "links.js"
PLACEHOLDER = "https://example.github.io/prop-navi"

# dist に含めない（公開する必要がない）もの
EXCLUDE = {
    "OPERATIONS.md",
    "公開手順.md",
    "check_links.py",
    "publish.py",
    "generate_images.py",
    "publish_config.json",
    "dist",
    "__pycache__",
    ".DS_Store",
}
# 末尾一致で除外: テスト・バックアップ・設定の控え（Founderの .bak がそのまま公開されないように）。
EXCLUDE_SUFFIX = {".test.js", ".bak", ".orig"}
# 接頭辞一致で除外: publish_config.json / publish_config.json.bak 等の設定控え一式。
EXCLUDE_PREFIX = {"publish_config"}


def ask(prompt, default="", required=False):
    """対話プロンプト。空Enterでdefault。requiredなら入力されるまで聞く。"""
    while True:
        suffix = f"（Enterで「{default}」）" if default else ("（必須）" if required else "（空Enterでスキップ可）")
        value = input(f"{prompt} {suffix}\n> ").strip()
        if not value:
            value = default
        if value or not required:
            return value
        print("  → ここは必須です。入力してください。")


def ask_paste(prompt, has_saved=False):
    """複数行貼り付け対応プロンプト（アフィリURL/広告コード用）。

    ASPの広告コードは改行を含むことがあるため、空行（Enter2回目）まで読み続ける。
    何も貼らずにEnterだけなら ""（保存値があれば維持の意味）を返す。
    """
    hint = "（Enterだけ=前回の値を維持）" if has_saved else "（Enterだけ=スキップ）"
    print(f"{prompt}")
    print(f"  URLでも、ASPの広告コード丸ごとでもOK。貼り付けてEnter。複数行コードは最後に空行 {hint}")
    lines = []
    while True:
        line = input("> ")
        if line.strip() == "":
            break
        lines.append(line)
    return "\n".join(lines).strip()


URL_RE = re.compile(r'^https?://[^\s"\'<>]+$')


def sanitize_ad_input(raw):
    """貼り付け値を (url, banner_html) に振り分ける。

    - 素のURL → (url, "")
    - テキスト広告コード（<a href=...>） → hrefを抽出して (url, "")
    - バナー広告コード（<a href=...><img 画像>） → (url, 貼られた全文を無加工で保持)
      ※ ASPのリンクコードは改変禁止のため banner_html はそのまま出力に使う。
    - 不完全な断片（<img>だけ等、リンク先が取れない） → ("", "") で投入しない（壊れ防止）。
    """
    raw = (raw or "").strip()
    if not raw:
        return "", ""
    if "<" not in raw:
        return (raw, "") if URL_RE.match(raw) else ("", "")
    m = re.search(r'href="([^"]+)"', raw) or re.search(r"href='([^']+)'", raw)
    if not m or not URL_RE.match(m.group(1)):
        return "", ""
    url = m.group(1)
    # 1x1のビーコンではない実画像（=バナー）を含むか。A8のバナー画像は /svt/bgt が目印。
    is_banner = bool(re.search(r'<img[^>]+(?:/svt/bgt|width="(?!0"|1")\d{2,})', raw))
    return url, (raw if is_banner else "")


def js_escape(value):
    """JS文字列リテラル用エスケープ（json.dumpsの外側の引用符を剥がす）。"""
    return json.dumps(value, ensure_ascii=False)[1:-1]


def load_config():
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return {}


def save_config(cfg):
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


def read_affiliate_slots():
    """links.js の affiliates 配列から (key, label) を順に読む（多プログラム対応）。

    各枠の key をそのまま設定キーに使うため、旧 "ftmo"/"fintokei" の保存値は新形式でも
    自動的に引き継がれる（互換維持）。links.js が読めない場合は最低限 ftmo/fintokei を返す。
    """
    try:
        text = LINKS_JS.read_text(encoding="utf-8")
    except OSError:
        return [("ftmo", "FTMO（公式アフィリエイト）"), ("fintokei", "Fintokei（公式アフィリエイト）")]

    # affiliates: [ ... ] のブロックだけを対象にする（note.url 等の誤検出を避ける）。
    m = re.search(r"affiliates:\s*\[([\s\S]*?)\n\s*\],", text)
    block = m.group(1) if m else text

    slots = []
    # 各エントリの key と label を順序どおりに拾う。
    for entry in re.finditer(r'key:\s*"([^"]+)"[\s\S]*?label:\s*"([^"]+)"', block):
        slots.append((entry.group(1), entry.group(2)))
    return slots or [("ftmo", "FTMO（公式アフィリエイト）")]


def gather_config(args):
    cfg = {} if args.reset else load_config()
    slots = read_affiliate_slots()                 # links.js から動的に読む（多プログラム対応）

    # 引数があれば優先（後方互換の --ftmo/--fintokei も含む）。
    for key in ("user", "repo", "url", "ftmo", "fintokei", "note", "handle", "contact", "sitename"):
        value = getattr(args, key, None)
        if value:
            cfg[key] = value
    # 汎用 --affiliate key=URL（複数指定可）。新しい枠を引数でも入れられる。
    for item in (args.affiliate or []):
        if "=" in item:
            k, v = item.split("=", 1)
            cfg[k.strip()] = v.strip()

    interactive = not args.yes
    if interactive:
        print("=" * 60)
        print(" プロップナビ 公開準備ウィザード")
        print(" （2回目以降は前回の答えがEnterだけで使えます）")
        print("=" * 60)

        if not cfg.get("url"):
            print("\n[公開URL] GitHub Pagesでは")
            print("      https://ユーザー名.github.io/リポジトリ名 になります。")
            cfg["user"] = ask("GitHubのユーザー名", cfg.get("user", ""), required=True)
            cfg["repo"] = ask("リポジトリ名", cfg.get("repo", "prop-navi"))

        # アフィリ枠は links.js の affiliates をそのまま順に聞く（枠を増やしてもコード修正不要）。
        # URLでもASPの広告コード丸ごとでも受け付け、URLとバナーに自動で振り分ける。
        print(f"\n[アフィリリンク] {len(slots)} 枠。")
        print("      A8等の広告コードは「1案件のコードを丸ごと1つの枠に」貼る（バラさない）。")
        print("      未登録の枠はEnterでスキップ→後で再実行すれば入れられます（空＝サイト上は「準備中」表示）。")
        for key, label in slots:
            saved_url = cfg.get(key, "")
            saved_banner = cfg.get(key + "_banner", "")
            state = "設定済み" + ("・バナーあり" if saved_banner else "") if saved_url else "未設定"
            raw = ask_paste(f"■ {label}［現在: {state}］", has_saved=bool(saved_url))
            if raw:
                url, banner = sanitize_ad_input(raw)
                if url:
                    cfg[key] = url
                    if banner:
                        cfg[key + "_banner"] = banner
                    print(f"  ✔ リンクを設定しました{'（バナーも表示されます）' if banner else ''}")
                else:
                    print("  ⚠ リンク先URLが見つかりません。広告コードを丸ごと（<a href=…>から）貼り直してください。今回は未設定のままにします。")

        print("\n[note] noteの記事URL（書いた後でOK。未公開なら空Enter）。")
        cfg["note"] = ask("note記事URL", cfg.get("note", ""))
        print("\n[運営者名] サイトに表示する運営者名（ハンドルネーム可・本名不要）。")
        cfg["handle"] = ask("運営者名", cfg.get("handle", ""))
        print("\n[連絡先] 問い合わせ先（XのプロフィールURL か メールアドレス。任意）。")
        cfg["contact"] = ask("連絡先", cfg.get("contact", ""))
        print("\n[サイト名] 変えたければどうぞ。")
        cfg["sitename"] = ask("サイト名", cfg.get("sitename", "プロップナビ"))

    if not cfg.get("url"):
        if not (cfg.get("user") and cfg.get("repo")):
            sys.exit("エラー: 公開URLが決まりません。--user/--repo か --url を指定してください。")
        cfg["url"] = f"https://{cfg['user']}.github.io/{cfg['repo']}"
    cfg["url"] = cfg["url"].rstrip("/")
    cfg.setdefault("sitename", "プロップナビ")

    # 保存値の浄化: 過去に広告コードがURL欄へ素のまま保存されていても、ここで必ず
    # (url, banner) に振り分け直す。リンク先が取れない断片は破棄（リンク切れ・JS破壊防止）。
    for key, _label in slots:
        url, banner = sanitize_ad_input(cfg.get(key, ""))
        if cfg.get(key, "") and not url:
            print(f"  ⚠ 「{key}」の保存値からリンク先URLを取り出せないため未設定に戻しました（広告コードを丸ごと貼り直してください）。")
        cfg[key] = url
        if banner:
            cfg[key + "_banner"] = banner
        # バナー欄自体も検証（hrefの無い断片・テキスト広告の混入は破棄）
        _u, b_banner = sanitize_ad_input(cfg.get(key + "_banner", ""))
        cfg[key + "_banner"] = b_banner

    save_config(cfg)
    return cfg


def build_dist(cfg):
    today = datetime.date.today().isoformat()
    if DIST.exists():
        shutil.rmtree(DIST)

    def ignored(directory, names):
        skip = set()
        for name in names:
            if (
                name in EXCLUDE
                or any(name.endswith(sfx) for sfx in EXCLUDE_SUFFIX)
                or any(name.startswith(pfx) for pfx in EXCLUDE_PREFIX)
            ):
                skip.add(name)
        return skip

    shutil.copytree(ROOT, DIST, ignore=ignored)

    for path in DIST.rglob("*"):
        if path.suffix not in {".html", ".xml", ".txt", ".js", ".css"} or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        original = text

        # ベースURLの一括置換（canonical / og:url / JSON-LD / sitemap / robots / links.js）
        text = text.replace(PLACEHOLDER, cfg["url"])

        # サイト名の一括差し替え（リネーム対応）。ソース内の正準名「プロップナビ」を
        # 表示名に置換する。<title>/OGP/JSON-LD/本文の自称もまとめて変わる。
        if cfg.get("sitename") and cfg["sitename"] != "プロップナビ" and path.suffix in {".html", ".js"}:
            text = text.replace("プロップナビ", cfg["sitename"])

        # キャッシュ破棄: HTMLが読む自前アセット(css/js)に ?v=<日付> を付ける。
        # 公開のたびにURLが変わるため、再訪問者のブラウザも必ず最新版を取得する
        # （JS/CSSを更新しても古いキャッシュが残る問題を根本回避）。
        if path.suffix == ".html":
            text = re.sub(
                r'((?:src|href)=")((?:\.\./)?(?:tools/)?assets/[^"?]+?\.(?:css|js))(")',
                lambda m: m.group(1) + m.group(2) + "?v=" + today.replace("-", "") + m.group(3),
                text,
            )

        if path.name == "links.js":
            # サイト名・更新日
            text = re.sub(r'(name: ")[^"]*(",)', rf'\g<1>{cfg["sitename"]}\g<2>', text, count=1)
            text = re.sub(r'(updated: ")[^"]*(",)', rf'\g<1>{today}\g<2>', text, count=1)
            # アフィリのURL・バナー投入（links.js の全枠を動的に。空のままなら「準備中」表示で害なし）。
            # 旧 "ftmo"/"fintokei" の保存値も、キー名が一致するため自動で引き継がれる。
            # 値は必ずJSエスケープして投入する（広告コードの引用符でJSが壊れないように）。
            for key, _label in read_affiliate_slots():
                url = cfg.get(key)
                if url:
                    text = re.sub(
                        rf'(key: "{re.escape(key)}",[\s\S]*?url: ")[^"]*(")',
                        lambda m, u=js_escape(url): m.group(1) + u + m.group(2),
                        text,
                        count=1,
                    )
                banner = cfg.get(key + "_banner")
                if banner:
                    text = re.sub(
                        rf'(key: "{re.escape(key)}",[\s\S]*?bannerHtml: ")[^"]*(")',
                        lambda m, b=js_escape(banner): m.group(1) + b + m.group(2),
                        text,
                        count=1,
                    )
            # noteのURL投入
            if cfg.get("note"):
                text = re.sub(
                    r'(note: \{[\s\S]*?url: ")[^"]*(")',
                    lambda m: m.group(1) + cfg["note"] + m.group(2),
                    text,
                    count=1,
                )

        if path.name == "sitemap.xml":
            text = re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{today}</lastmod>", text)

        if path.name == "about.html" and cfg.get("handle"):
            contact = f"／問い合わせ: {cfg['contact']}" if cfg.get("contact") else ""
            profile = (
                f'<p class="source">運営者: {cfg["handle"]}（FX・マクロ経済の分析を背景に持つ個人運営）{contact}</p>'
            )
            # TODOコメント＋「準備中」段落をプロフィールに置き換え
            text = re.sub(r"<!-- TODO\(Founder\):[\s\S]*?-->", "", text)
            text = re.sub(
                r'<p class="source">\s*※ 連絡先・運営者プロフィールは公開準備中です。[\s\S]*?</p>',
                profile,
                text,
            )

        if text != original:
            path.write_text(text, encoding="utf-8")

    return today


def validate():
    """dist/ を check_links.py で検証＋置換漏れを確認。"""
    problems = []

    # 置換漏れチェック
    for path in DIST.rglob("*"):
        if path.is_file() and path.suffix in {".html", ".xml", ".txt", ".js"}:
            if PLACEHOLDER in path.read_text(encoding="utf-8"):
                problems.append(f"置換漏れ: {path.relative_to(DIST)} に {PLACEHOLDER} が残っています")

    # check_links.py を dist にコピーして実行（公開物には含めない）
    checker_src = ROOT / "check_links.py"
    checker_dst = DIST / "check_links.py"
    shutil.copy(checker_src, checker_dst)
    try:
        result = subprocess.run(
            [sys.executable, "check_links.py"], cwd=DIST, capture_output=True, text=True
        )
        if result.returncode != 0:
            problems.append("check_links.py が問題を検出:\n" + result.stdout + result.stderr)
    finally:
        checker_dst.unlink()

    # JS構文チェック（広告コードの引用符等でJSが壊れていたら公開前に必ず止める）
    node = shutil.which("node")
    if node:
        for js in sorted(DIST.rglob("*.js")):
            check = subprocess.run([node, "--check", str(js)], capture_output=True, text=True)
            if check.returncode != 0:
                problems.append(f"JS構文エラー: {js.relative_to(DIST)}\n{check.stderr.strip()}")

    return problems


def main():
    parser = argparse.ArgumentParser(description="プロップナビ公開準備（dist/ 生成）")
    parser.add_argument("--user", help="GitHubユーザー名")
    parser.add_argument("--repo", help="リポジトリ名（既定: prop-navi）")
    parser.add_argument("--url", help="公開URLを直接指定（独自ドメイン等）")
    parser.add_argument("--ftmo", help="FTMOアフィリURL（後方互換。--affiliate ftmo=URL でも可）")
    parser.add_argument("--fintokei", help="FintokeiアフィリURL（後方互換。規制親会社の確認後のみ）")
    parser.add_argument(
        "--affiliate",
        action="append",
        metavar="KEY=URL",
        help="任意のアフィリ枠のURL（links.js の key を指定。例 --affiliate conoha=https://... 複数可）",
    )
    parser.add_argument("--note", help="note記事URL")
    parser.add_argument("--handle", help="運営者名（ハンドル可）")
    parser.add_argument("--contact", help="連絡先（X URL か メール）")
    parser.add_argument("--sitename", help="サイト名（既定: プロップナビ）")
    parser.add_argument("--reset", action="store_true", help="保存済み設定を破棄")
    parser.add_argument("--yes", action="store_true", help="対話せず引数/保存設定だけで実行")
    args = parser.parse_args()

    cfg = gather_config(args)
    today = build_dist(cfg)
    problems = validate()

    print("\n" + "=" * 60)
    if problems:
        print(" ⚠ 問題が見つかりました。修正してから再実行してください。")
        for p in problems:
            print("  - " + p)
        sys.exit(1)

    print(" ✔ dist/ の生成と検証が完了しました（更新日: " + today + "）")
    print("=" * 60)
    print(f"\n公開URL        : {cfg['url']}")
    # アフィリ枠は links.js から動的に。投入済み/未設定を一覧する。
    print("アフィリ枠      :")
    for key, label in read_affiliate_slots():
        state = cfg.get(key) or "未設定（「準備中」表示。登録後に再実行で投入）"
        print(f"  - {label}: {state}")
    print(f"note          : {cfg.get('note') or '未設定（「準備中」表示）'}")
    print(f"運営者名       : {cfg.get('handle') or '未設定（「公開準備中」表示のまま）'}")
    print(f"""
次にやること（詳細は 公開手順.md）:
 1. GitHubのリポジトリに dist/ の【中身】をアップロード（distという箱ごとではなく中身）
 2. リポジトリの Settings → Pages → Branch: main / (root) → Save
 3. 数分待って {cfg['url']}/ が表示されるか確認
 4. Google Search Console に sitemap.xml を登録
""")


if __name__ == "__main__":
    main()

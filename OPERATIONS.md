# FXコンパス 運用ランブック（OPERATIONS.md）

1サイト目「FX総合メディア」の運用手順。FXの始め方・口座比較・取引ツール／VPS環境・税金・プロップファームを
出典付きで整理・比較する（プロップファームは数あるカテゴリの1つで、最も深く追っている分野）。
技術前提: 静的HTML + 共通CSS + vanilla JS。ビルド工程なし・外部CDN/解析タグなし・APIランタイムコストゼロ。
ホスティングは GitHub Pages を想定（無料・静的）。

---

## 0. ディレクトリ構成

```
sites/prop-navi/
  index.html                     ポータルトップ（FX総合メディアの入口・カテゴリ別ハブ・各記事へ送客）
  about.html                     運営者情報・編集方針（E-E-A-T／マスコット「コンパスくん」＋編集長「カイ」紹介）
  guide/fx-hajimekata.html       はじめてのFX（仕組み・必要資金・口座開設の流れ＝FX総合メディアの入口ピラー）
  guide/vps.html                 プロップ向けVPS比較（収益主砲＝ConoHa・戦略v2新規）
  guide/kokunai-kouza.html       練習・検証用の国内FX/CFD口座（DMM FX/GMO/DMM CFD・新規）
  guide/tradingview.html         TradingView活用ガイド（DD管理アラート・継続収益・新規）
  guide/shikin-kanri.html        プロップの資金管理 実務ガイド（計算ツールへのハブ・新規）
  guide/vps-setup.html           ConoHa VPSでMT5を24時間動かす設定手順（CV直結・第2弾・promos=conoha+tradingview）
  guide/mac-mt5.html             MacでMT4/MT5を使う3つの方法（MT5 Mac使えない層・第2弾・promos=conoha+tradingview）
  guide/ftmo.html                FTMO徹底ガイド（プロップ集客装置・第1指名）
  guide/erabikata.html           選び方と比較（運営年数・透明性・規制の3軸）
  guide/prop-no-risk.html        リスクと失敗パターン（やめとけ/怪しい・第2弾・promos=ftmo）
  guide/challenge-rules.html     チャレンジルール完全ガイド（DD計算）
  guide/kakutei-shinkoku.html    税金・確定申告ガイド（国税庁出典・個別判断は税理士へ・第2弾・主CTAなし）
  guide/prop-yougo.html          プロップファーム用語集50語（内部リンクのハブ・第2弾・主CTAなし）
  guide/koushin-log.html         規約変更・業界動向ウォッチ（透明性ページ・週次追記・第2弾・主CTAなし）
  guide/shikin-kessai-hou.html   改正資金決済法と移行の実際（誇張しない・アフィリ枠なし）
  legal/disclaimer.html          免責
  legal/pr-policy.html           広告掲載ポリシー（ステマ規制対応）
  tools/calculator.html          資金管理＆チャレンジROI計算ツール（ROIシミュレータ追加）
  tools/tracker.html             進捗トラッキング（同上）
  assets/links.js                サイト名・ベースURL・アフィリ(多プログラム)/noteリンクの単一管理
  assets/site.css                共通スタイル（雑誌風・TOC/SVG図解/比較表強調を追加）
  assets/site.js                 共通ヘッダ/フッタ/免責バー/アフィリ導線（ページ別出し分け）の描画
  tools/assets/calc.js           計算ロジック（prop-tools からコピー・ROI関数を追加）
  tools/assets/storage.js        localStorage ラッパ（同上・ROIキー追加）
  tools/assets/chart.js          Canvas折れ線（同上）
  tools/assets/calc.test.js      calc.js ユニットテスト（同上・16件: 既存11＋ROI5）
  tools/assets/tool-config.js    計算ベンチマーク初期値（差し替え可能・roi初期値追加）
  tools/assets/tools.css         ツール専用ウィジェットのスタイル
  sitemap.xml / robots.txt       SEO（新規4ページを追加）
  check_links.py                 内部リンク/sitemap/禁止文言の自動検証
  publish.py                     公開準備（dist/生成・links.js のアフィリ枠を動的に投入）
  OPERATIONS.md                  本ファイル
```

注: `tools/assets/calc.js` 等は `prop-tools/assets/` から**コピー**したもの。prop-tools/ 原本は変更しない。
ロジックを直す場合は prop-tools 原本と差分が開かないよう、両方を更新するか、コピー元を一本化する判断を別途行う。
（戦略v2で追加した `computeChallengeRoi` は prop-navi 側のツール固有関数。原本に戻す必要が出たら別途判断する。）

**アフィリ導線の方針（戦略v2）**: links.js の `affiliates` は多プログラム対応。各枠に `category`/`slot`/`pages` を持ち、
site.js が各ページの `page` キーと突き合わせて関連枠だけを表示する（全ページ同一羅列はしない）。
収益主柱は国内合法アフィリ（VPS=ConoHa／国内FX・CFD=DMM/GMO／チャート=TradingView／暗号資産=Coincheck）。
プロップ（FTMO/Fintokei）はSEO集客装置で比較・ガイド系に限定。**海外FXブローカー枠は作らない**（金商法の無登録媒介リスク）。

---

## 1. 公開前 Founder 最終チェックリスト（ハード条件）

> **初心者向け**: 本節のうち「links.js差し替え」「ベースURL一括置換」は `python3 publish.py` が自動化済み
> （対話に答えるだけでアップロード用 `dist/` を生成・検証する）。手順全体は **公開手順.md** を参照。
> 以下のチェックリストは「publish.py が何をしているか」の確認用としても使える。

公開（GitHub Pages 有効化）前に、Founder が必ず確認する。

- [ ] **links.js の差し替え**
  - [ ] `site.baseUrl` を実際の公開URL（末尾スラッシュなし）に変更した
  - [ ] `site.name`（サイト名「FXコンパス」）を確定した
  - [ ] アフィリURL（FTMO枠＝第1指名）を自分のアフィリ登録リンクに差し替えた
  - [ ] Fintokei枠は「親会社が規制ブローカー」条件を自分で確認できた場合のみURL投入。未確認なら空のまま（=「準備中」表示で害なし）
  - [ ] `note.url` は note 公開後に投入（未公開なら空のまま）
- [ ] **ベースURLの一括置換**（links.js 以外の埋め込み箇所）
  - [ ] 各HTMLの canonical / og:url / JSON-LD の `https://example.github.io/prop-navi` を実URLへ一括置換した
  - [ ] `sitemap.xml` / `robots.txt` の `https://example.github.io/prop-navi` を実URLへ一括置換した
  - [ ] 置換後に `python3 check_links.py` の sitemap セクションが OK のままか確認した
- [ ] **法務・文言（R1ハード条件）**
  - [ ] 全ページに免責バー・PR表記が出ている（`check_links.py` の禁止文言0件を確認）
  - [ ] 売買助言（通貨ペア・タイミング・手法推奨）が本文に無い
  - [ ] 免責 / 広告掲載ポリシーの文言を最終確認した（必要なら法務照合）
  - [ ] about.html の運営者プロフィール TODO（実名/ハンドル・経歴・連絡先）を埋めた
- [ ] **体験談**: 「編集部メモ」はすべて意見・観察であり、捏造体験談・トレード実績の主張が無いことを確認した
- [ ] 実ブラウザ（PC + スマホ幅）でレイアウト崩れ・ヘッダ/フッタ/promos描画を目視確認した

---

## 2. デプロイ手順（GitHub Pages）

1. リポジトリ（既存スモビジと同一でも、prop-navi専用に新規でも可）に `sites/prop-navi/` を push。
2. GitHub Pages を「Deploy from a branch」で有効化。
   - 公開ディレクトリにサブフォルダ（`sites/prop-navi/`）を直接は指定できないため、いずれか:
     - (a) `sites/prop-navi/` の中身をリポジトリ直下 or `docs/` に配置して Pages のソースを `/docs` にする、または
     - (b) prop-navi 専用リポジトリを作り、その直下に中身を置く（推奨。デプロイ単位がサイト1つに揃う）。
3. 公開URLが決まったら **§1のベースURL一括置換**を実施して再 push。
4. 公開後、`https://<公開URL>/sitemap.xml` を Google Search Console に登録し、インデックスをリクエスト。
5. ローカル確認は `cd sites/prop-navi && python3 -m http.server 8000` → `http://localhost:8000/`。

---

## 3. 週次更新サイクル

SEOは鮮度と網羅で勝つ。週1で以下を回す。

### 監視先（新ファーム・ルール変更・規制動向／戦略v2の収益アフィリ条件）
プロップ（SEO集客装置）の動向:
- FTMO 公式（ルール・報酬・親会社OANDA関連の更新）: https://ftmo.com/
- Fintokei 公式（規約・自己アフィリ規約・親会社情報）: https://fintokei.com/
- WOZ media（市場調査・ランキング・各社レビュー）: https://woz.co.jp/jpmedia/
- Myforex（プロップ・海外FXニュース）: https://myforex.com/ja/

収益アフィリ（国内合法・単価/条件の変更を追う＝報酬最大化）:
- ConoHa VPS（FX自動売買向けプラン・アフィリ単価）: https://vps.conoha.jp/affiliate/
- お名前.com デスクトップクラウド（FX専用VPS）: https://www.onamae-desktop.com/
- DMM FX / DMM CFD（条件・キャンペーン）: https://fx.dmm.com/ ／ https://cfd.dmm.com/
- GMOクリック証券 FXネオ（条件）: https://www.click-sec.com/corp/guide/fxneo/
- TradingView パートナープログラム（料金プラン・報酬条件）: https://jp.tradingview.com/partner-program/
- 各ASP管理画面（A8.net・もしも・アクセストレード等）で**実単価・成果条件の変更**を確認し links.js の note と単価表記を更新

規制・消費者保護:
- 金融庁（資金決済法・暗号資産・無登録業者の動向／海外FX勧誘の注意喚起）: https://www.fsa.go.jp/
- 国民生活センター/消費者庁（プロップ・投資詐欺の注意喚起、PR表記規制）

### 週次タスク
1. 上記監視先で「ルール変更・新規制・出金トラブル報道」をチェック。該当あれば関連記事の本文と更新日（`<time>` と article-meta、JSON-LD の `dateModified`）を更新。
2. **`guide/koushin-log.html`（規約変更・業界動向ウォッチ）に追記**。確認できた変更を「日付・区分・内容・出典」で更新ログ表の先頭（新しい順）に1行追加する。**未確認の日付・数値は「要確認」と明記し、捏造しない**。本サイトの記事追加・更新もこのログに残す。更新したら同ページの article-meta／JSON-LD の `dateModified` も当日に更新。
3. 比較表（erabikata.html）の各社の数値が古くなっていないか確認。古ければ「公式要確認」へ退避し、確認後に更新。
4. 新たに3軸（運営年数3年以上・支払い実績透明・親会社規制）を満たすファームが出たら、links.js への追加候補としてメモ（無名・新興は追加しない）。
5. `python3 check_links.py` を実行し、リンク切れ・禁止文言・外部script混入が無いことを確認。
6. `links.js` の `site.updated` と sitemap の `lastmod` を更新した日付に合わせる。

---

## 4. リンク切れチェック（check_links.py）

```bash
cd sites/prop-navi
python3 check_links.py
```

検証内容:
- 全HTMLの内部リンク（href/src）が実在ファイルを指すか
- sitemap.xml の全URLが実在ファイルに対応するか（ベースURL一致も確認）
- 禁止文言（買え/売れ/必ず勝て/確実に合格 等）が本文に0件か
- 外部script（http(s)://）を読み込んでいないか（依存ゼロ違反の検出）

致命的な問題があれば終了コード1。CI に載せる場合はこの終了コードを使う。
外部リンク（出典・アフィリ）の到達性は本スクリプトでは検証しない（ネットワーク非依存にするため）。
外部リンク切れは週次で目視 or 別途 `curl` で確認する。

---

## 5. note 二次利用の手順

オーケストレーター判断により、note は「サイト記事の二次利用（再編集）」に格下げ。
note 規約は「主としてアフィリ目的・外部誘導」の記事を禁止するため、note 単体をアフィリ主戦場にしない。

1. サイト記事（例: challenge-rules.html）を土台に、note 向けに読み物として再編集する。
   - 出典・事実・ルール解説はそのまま使う。売買助言は入れない（サイトと同基準）。
2. note 記事内では露骨なアフィリ羅列を避け、「詳しい比較・計算ツールは本サイトへ」という形でサイトへ誘導（自社資産へ流す）。
3. note 記事公開後、`links.js` の `note.url` にURLを入れる（サイト側 promos に「準備中」でなく実リンクが出る）。
4. note 内で広告を含む場合は note 側でも「PR」表記を明示（ステマ規制はnoteでも適用）。

---

## 6. 2サイト目への横展開メモ

1サイト目の検証データ（インデックス状況・オーガニッククリック・初成約）が出てから着手する。

- **テンプレ流用**: `assets/site.css` / `assets/site.js`（ヘッダ/フッタ/promos/免責の共通描画）と `check_links.py` はサイト非依存。新サイトへコピーし、`links.js`（サイト名・色・リンク）と記事だけ差し替える。
- **配色変更**: site.css の `:root` 変数（--navy/--paper/--accent）を変えればトーンを変えられる。AI典型デザイン（絵文字箇条書き・紫グラデ・カード乱発）は引き続き避ける。
- **候補ニッチ**: PROJECT.md の O3（中小×AI導入×補助金）等、SERP未飽和で高単価・出典が取れる領域。法規制（YMYL・景表法）は同じ基準で全面適用する。
- **共通ロジックの一本化**: 計算ツールを複数サイトで使う場合、calc.js のコピーが増えすぎないよう、共通リポジトリ or サブモジュール化を検討（現状はコピーで運用）。

---

## 7. トラブル時の切り分け

| 症状 | 確認 |
|---|---|
| ヘッダ/フッタ/promos が表示されない | ブラウザのコンソールで JS エラーを確認。`links.js` → `site.js` の読み込み順、`data-root` 属性（ルート="" / guide・tools・legal="../"）が正しいか |
| アフィリリンクが「準備中」のまま | `links.js` の該当 `url` が空。実URLを入れる |
| sitemap で404 | ベースURL一括置換漏れ。`check_links.py` の sitemap セクションで該当URLを特定 |
| 計算結果が出ない | tools/assets の calc.js / storage.js / tool-config.js の読み込み、入力値のバリデーション（%レンジ・正数）を確認 |
| 記録が消える | localStorage 無効（プライベートモード等）。storage.js はメモリにフォールバックするため、その場合リロードで消えるのは仕様 |

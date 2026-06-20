/*
 * links.js — サイト全体の差し替え可能な設定の単一管理ファイル
 *
 * このファイルだけを編集すれば、コードを触らずに以下を差し替えられる:
 *   - サイト名・ベースURL（GitHub Pages公開時の絶対URL。OGP/JSON-LD/sitemapの差し替え位置）
 *   - アフィリエイトリンク（多プログラム対応。PR/広告表記が必須。url空=「準備中」）
 *   - noteリンク（二次利用の攻略note等。未作成なら「準備中」表示のまま）
 *
 * 法規制メモ（PROJECT.md サイト戦略v2 §3・R1/R7 ハード条件 準拠）:
 *   - 海外FXブローカーのアフィリ枠は作らない（金商法の無登録媒介リスク。関東財務局は
 *     "情報発信そのものも媒介に当たる"との見解）。このファイルに海外FX口座の枠は置かない。
 *   - プロップ枠（FTMO等）は審査済み1〜2社に限定し、SEO集客装置と位置づける（収益主柱にしない）。
 *   - 収益の主柱は国内で合法に扱える高単価アフィリ（FX用VPS・国内FX/CFD・チャートツール・暗号資産）。
 *   - 全リンク枠に「PR」表記を必ず出す（景表法ステマ規制 2023/10〜）。
 *   - 実URL・実単価はFounder本人のASP登録が必要。公開前にFounderが文言と適法性を最終確認する。
 *
 * affiliates のスキーマ（site.js が読む）:
 *   key        … 内部識別子（publish.py がこのキーでURLを投入する。旧 "ftmo"/"fintokei" は互換維持）。
 *   label      … 表示名。
 *   url        … アフィリURL。"" のままなら「準備中（リンク未設定）」表示。
 *   bannerHtml … ASPのバナー広告コード（<a>+<img> 一式）をそのまま入れる欄。空なら非表示。
 *                A8等のリンクコードは改変禁止のため、コピーした全文を無加工で保持する
 *                （publish.py が広告コード貼り付けから自動で url と bannerHtml に振り分ける）。
 *   note       … 1行の補足（掲載理由・単価の出典など。捏造体験談は書かない）。
 *   category   … 区分（"prop" | "vps" | "kokunai-fx" | "kokunai-cfd" | "chart" | "crypto"）。
 *   slot       … 表示役割。"primary"=記事の主CTA候補 / "always"=常設サブ（全対象ページ）。
 *   pages      … この枠を出すページのキー配列。site.js が data-page と突き合わせて出し分ける。
 *                "*" を含めると全ページ対象。ページキーは各HTMLの PropNavi.init({ page: "..." }) と一致させる。
 */

window.PROPNAVI = {
  // -------------------------------------------------------------------------
  // サイト基本情報
  //   baseUrl は GitHub Pages 等の公開URL。canonical / OGP / JSON-LD / sitemap が参照する。
  //   末尾スラッシュなし。公開ドメインが決まったらここだけ差し替える。
  // -------------------------------------------------------------------------
  site: {
    name: "FXコンパス",                            // サイト名（表示名。URL/リポジトリ名 prop-navi は不変）
    tagline: "FXの、迷わない地図。",
    baseUrl: "https://hajimete-fx.com", // ← 公開URLに差し替え（末尾スラッシュなし）
    updated: "2026-06-20",                         // サイト全体の最終更新日（フッタ表示用）
  },

  // -------------------------------------------------------------------------
  // アフィリエイトリンク枠（多プログラム）
  //   url を "" のままにすると、その枠は「準備中（リンク未設定）」として表示される。
  //   pages で出し分け、slot で「主CTA候補(primary)」か「常設サブ(always)」かを制御する。
  //   海外FXブローカー枠は作らない（法規制ハード条件）。
  // -------------------------------------------------------------------------
  affiliates: [
    // --- プロップ（SEO集客装置・審査済み1〜2社に限定。収益主柱にはしない） ---
    {
      key: "ftmo",
      label: "FTMO（公式アフィリエイト）",
      url: "https://trader.ftmo.com/?affiliates=ttxsZHweBHbKLUSIciUu",   // ← FounderのFTMO直アフィリ登録後にURLを差し替え（ftmo.com/affiliate-programme）
      bannerHtml: "",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "2015年設立・運営11年。親会社が規制ブローカーOANDA（2025年買収完了）。プロップの第1指名。",
      category: "prop",
      slot: "primary",
      pages: ["index", "ftmo", "erabikata", "challenge-rules", "shikin-kanri", "calculator", "tracker", "prop-no-risk"],
    },
    {
      key: "fintokei",
      label: "Fintokei（公式アフィリエイト）",
      url: "",   // ← 第2指名。親会社の規制状況をFounderが確認後に掲載（未確認なら空のまま）
      bannerHtml: "",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "日本最大シェア。規制ブローカー親会社条件はFounder確認後に掲載。1社運用なら空でよい。",
      category: "prop",
      slot: "primary",
      pages: ["erabikata"],
    },

    // --- FX用VPS（収益主砲・最高単価。ASP=A8/もしも経由） ---
    {
      key: "conoha",
      label: "ConoHa VPS（FX自動売買向け）",
      url: "https://px.a8.net/svt/ejp?a8mat=4B5UW4+DXB04Y+50+4YNYXD",   // ← FounderがA8.net/もしもアフィリで提携後にURLを差し替え
      bannerHtml: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4B5UW4+DXB04Y+50+4YNYXD\" rel=\"nofollow\">\n<img border=\"0\" width=\"320\" height=\"50\" alt=\"\" src=\"https://www23.a8.net/svt/bgt?aid=260613796842&wid=001&eno=01&mid=s00000000018030009000&mc=1\"></a>\n<img border=\"0\" width=\"1\" height=\"1\" src=\"https://www11.a8.net/0.gif?a8mat=4B5UW4+DXB04Y+50+4YNYXD\" alt=\"\">",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "国内サービス・合法。アフィリ単価は最大53,900円/件（ConoHa公式・要ASP管理画面で確定）。",
      category: "vps",
      slot: "primary",
      pages: ["vps", "vps-setup", "mac-mt5", "shikin-kanri", "calculator", "tracker", "fx-hajimekata", "fx-vps-hikaku", "ea-hajimekata", "mac-vps"],
    },
    {
      key: "xserver",
      label: "XServer VPS for FX",
      url: "https://px.a8.net/svt/ejp?a8mat=4B5VO8+5O7P9U+CO4+44WIE9",   // ← FounderがA8.net/もしもアフィリ等で提携後にURLを差し替え（未提携なら空=「準備中」）
      bannerHtml: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4B5VO8+5O7P9U+CO4+44WIE9\" rel=\"nofollow\">\n<img border=\"0\" width=\"468\" height=\"60\" alt=\"\" src=\"https://www26.a8.net/svt/bgt?aid=260614808343&wid=001&eno=01&mid=s00000001642025010000&mc=1\"></a>\n<img border=\"0\" width=\"1\" height=\"1\" src=\"https://www12.a8.net/0.gif?a8mat=4B5VO8+5O7P9U+CO4+44WIE9\" alt=\"\">",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "国内サービス・合法。FX自動売買向けプランを用意。料金・スペックは公式で要確認。複数ASP併用での取りこぼし回収枠。",
      category: "vps",
      slot: "primary",
      pages: ["fx-vps-hikaku", "vps", "vps-setup"],
    },
    {
      key: "onamae",
      label: "お名前.com デスクトップクラウド",
      url: "https://px.a8.net/svt/ejp?a8mat=4B5VO8+66O50Y+50+3N0NDT",   // ← FounderがA8.net/もしもアフィリ等で提携後にURLを差し替え（未提携なら空=「準備中」）
      bannerHtml: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4B5VO8+66O50Y+50+3N0NDT\" rel=\"nofollow\">\n<img border=\"0\" width=\"728\" height=\"90\" alt=\"\" src=\"https://www24.a8.net/svt/bgt?aid=260614808374&wid=001&eno=01&mid=s00000000018022006000&mc=1\"></a>\n<img border=\"0\" width=\"1\" height=\"1\" src=\"https://www13.a8.net/0.gif?a8mat=4B5VO8+66O50Y+50+3N0NDT\" alt=\"\">",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "国内サービス・合法。Windowsデスクトップ型でMT4/MT5導入を想定した設計。料金・スペックは公式で要確認。",
      category: "vps",
      slot: "primary",
      pages: ["fx-vps-hikaku", "vps", "vps-setup"],
    },

    // --- 国内FX/CFD（収益エンジン・合法高単価。ASP=A8等経由） ---
    {
      key: "dmmfx",
      label: "DMM FX（国内FX口座）",
      url: "https://px.a8.net/svt/ejp?a8mat=4B5UW4+EOOXYQ+1WP2+NY1Y9",   // ← FounderがA8.net等で提携後にURLを差し替え
      bannerHtml: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4B5UW4+EOOXYQ+1WP2+NY1Y9\" rel=\"nofollow\">\n<img border=\"0\" width=\"468\" height=\"60\" alt=\"\" src=\"https://www27.a8.net/svt/bgt?aid=260613796888&wid=001&eno=01&mid=s00000008903004022000&mc=1\"></a>\n<img border=\"0\" width=\"1\" height=\"1\" src=\"https://www16.a8.net/0.gif?a8mat=4B5UW4+EOOXYQ+1WP2+NY1Y9\" alt=\"\">",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "国内登録業者・合法。単価は通常1〜1.5万円・キャンペーン時2〜3万円（afbで27,500円実績／要ASP確認）。",
      category: "kokunai-fx",
      slot: "primary",
      pages: ["kokunai-kouza", "fx-hajimekata", "kouza-ranking", "ikura-kara", "demo-trade", "spread-hikaku", "fx-fukugyou", "swap-hikaku", "leverage-guide", "order-types", "fx-app-hikaku", "currency-pairs"],
    },
    {
      key: "gmoclick",
      label: "GMOクリック証券 FXネオ（国内FX口座）",
      url: "",   // ← FounderがA8.net等で提携後にURLを差し替え
      bannerHtml: "",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "国内登録業者・合法。単価は約1〜1.1万円（公開まとめベース・要ASP確認）。",
      category: "kokunai-fx",
      slot: "primary",
      pages: ["kokunai-kouza", "fx-hajimekata", "kouza-ranking", "ikura-kara", "demo-trade", "spread-hikaku", "fx-fukugyou", "swap-hikaku", "leverage-guide", "order-types", "fx-app-hikaku", "currency-pairs"],
    },
    {
      key: "dmmcfd",
      label: "DMM CFD（国内CFD）",
      url: "https://px.a8.net/svt/ejp?a8mat=4B5UW4+EOOXYQ+1WP2+NYHDT",   // ← FounderがA8.net等で提携後にURLを差し替え
      bannerHtml: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4B5UW4+EOOXYQ+1WP2+NYHDT\" rel=\"nofollow\">\n<img border=\"0\" width=\"728\" height=\"90\" alt=\"\" src=\"https://www29.a8.net/svt/bgt?aid=260613796888&wid=001&eno=01&mid=s00000008903004024000&mc=1\"></a>\n<img border=\"0\" width=\"1\" height=\"1\" src=\"https://www19.a8.net/0.gif?a8mat=4B5UW4+EOOXYQ+1WP2+NYHDT\" alt=\"\">",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "国内・合法。単価は14,200円（新規登録＋1回取引／A8.net高額ランキング・要ASP確認）。",
      category: "kokunai-cfd",
      slot: "primary",
      pages: ["kokunai-kouza", "gold-cfd"],
    },

    // --- チャートツール（継続収益・ライフタイム30%。ASP=TradingViewパートナー） ---
    {
      key: "tradingview",
      label: "TradingView（チャートツール）",
      url: "https://jp.tradingview.com/?aff_id=167608",   // ← FounderがTradingViewパートナー登録後にURLを差し替え
      bannerHtml: "",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "海外SaaSだが金融商品でない・合法。報酬は購入額の30%・ライフタイム継続（要パートナー管理画面で確定）。",
      category: "chart",
      slot: "always",
      pages: ["index", "vps", "vps-setup", "mac-mt5", "kokunai-kouza", "tradingview", "shikin-kanri", "challenge-rules", "calculator", "tracker", "fx-hajimekata", "fx-vps-hikaku", "ea-hajimekata", "mac-vps", "kouza-ranking", "ikura-kara", "tradingview-plan", "chart-yomikata", "demo-trade", "spread-hikaku", "leverage-guide", "order-types", "fx-app-hikaku", "currency-pairs"],
    },

    // --- 暗号資産取引所（補完・CFD/暗号資産トレーダー向け。ASP=A8/アクセストレード等） ---
    {
      key: "coincheck",
      label: "コインチェック（暗号資産取引所）",
      url: "",   // ← FounderがASP登録後にURLを差し替え（未提携なら空のまま=「準備中」）
      bannerHtml: "",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
      note: "国内登録の暗号資産交換業者・合法。単価は約7,000円/件（複数ASP・要管理画面で確定）。",
      category: "crypto",
      slot: "primary",
      pages: ["kokunai-kouza"],
    },
  ],

  // -------------------------------------------------------------------------
  // noteリンク（サイト記事の二次利用。売買助言は含めない）
  //   url が "" なら「準備中」表示。記事公開後にURLを差し替える。
  // -------------------------------------------------------------------------
  note: {
    label: "note（ルール解説の二次利用版）",
    url: "",   // ← note記事公開後にURLを差し替え
    bannerHtml: "",  // ← ASPバナーコードを丸ごと（任意。publish.py が投入）
    note: "サイト記事を再編集した読み物。ルール解説と事実記録のみ。売買助言は載せない。",
  },
};

/*
 * site.js — FXコンパス 共通の描画部品（ヘッダ/フッタ/免責バー/アフィリ導線）
 *
 * 役割:
 *   - 全ページ共通のヘッダ・ナビ・免責バー・フッタを1か所で描画し、文言のブレを防ぐ。
 *   - アフィリ/note導線（links.js のプレースホルダ）をPR表記付きで描画。URL空は「準備中」。
 *
 * パス方針:
 *   ページの階層が異なる（ルート / guide/ / legal/ / tools/）ため、各ページは
 *   data-root 属性（"" or "../"）でルートまでの相対プレフィックスを渡す。
 *   外部CDN/解析タグは読み込まない（依存ゼロ・APIコストゼロ）。
 *
 * 注意: 売買助言・通貨ペア・タイミングに類する文言は一切置かない（R1ハード条件）。
 *
 * アフィリ導線の出し分け（サイト戦略v2 §4「全ページ同一羅列をやめる」）:
 *   各ページは PropNavi.init({ promos:"...", page:"<ページキー>" }) でページキーを渡す。
 *   renderPromos は links.js の各枠の pages 配列と突き合わせ、そのページに関連する枠だけを描画する。
 *   page を渡さない（旧呼び出し）場合は従来どおり全枠を描画する（後方互換）。
 */

(function (root) {
  "use strict";

  var CFG = root.PROPNAVI || {};
  var SITE = CFG.site || {};

  // このスクリプトタグから data-root（ルートまでの相対プレフィックス）を読む。
  var thisScript = document.currentScript;
  var ROOT = (thisScript && thisScript.getAttribute("data-root")) || "";

  var DISCLAIMER_SHORT =
    "本サイトは情報提供を目的とし、投資助言・売買推奨ではありません。掲載リンクには広告（PR）を含みます。";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }

  // マスコット「コンパスくん」: 方位磁針のキャラ（外部画像を使わない自作インラインSVG）。
  // ヒーロー・吹き出し・信頼バンド・編集長カードで再利用する。
  var MASCOT_SVG =
    '<svg viewBox="0 0 120 120" role="img" aria-label="コンパスくん">' +
    '<defs><linearGradient id="cmg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#2f6bed"/><stop offset="1" stop-color="#7b3ff2"/></linearGradient></defs>' +
    '<circle cx="60" cy="62" r="46" fill="url(#cmg)"/>' +
    '<circle cx="60" cy="62" r="37" fill="#fff"/>' +
    '<circle cx="60" cy="62" r="37" fill="none" stroke="#e6eaf3" stroke-width="2"/>' +
    // 方位の点
    '<circle cx="60" cy="30" r="2.4" fill="#8b92a6"/><circle cx="60" cy="94" r="2.4" fill="#8b92a6"/>' +
    '<circle cx="28" cy="62" r="2.4" fill="#8b92a6"/><circle cx="92" cy="62" r="2.4" fill="#8b92a6"/>' +
    // 針
    '<polygon points="60,40 66,62 60,58 54,62" fill="#e5484d"/>' +
    '<polygon points="60,84 54,62 60,66 66,62" fill="#41507f"/>' +
    '<circle cx="60" cy="62" r="4" fill="#1b2030"/>' +
    // 顔
    '<circle cx="49" cy="58" r="3.2" fill="#1b2030"/><circle cx="71" cy="58" r="3.2" fill="#1b2030"/>' +
    '<path d="M52 70 Q60 76 68 70" fill="none" stroke="#1b2030" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="44" cy="66" r="3" fill="#ff9db1" opacity=".7"/><circle cx="76" cy="66" r="3" fill="#ff9db1" opacity=".7"/>' +
    '</svg>';

  // 編集長アバター（顔の見える編集長。実写でなくフラットな自作SVG）。
  var EDITOR_SVG =
    '<svg viewBox="0 0 64 64" role="img" aria-label="編集長カイ">' +
    '<defs><linearGradient id="edg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#2f6bed"/><stop offset="1" stop-color="#7b3ff2"/></linearGradient></defs>' +
    '<rect width="64" height="64" rx="16" fill="url(#edg)"/>' +
    '<circle cx="32" cy="26" r="12" fill="#ffe0c2"/>' +
    '<path d="M20 24 Q22 12 32 12 Q42 12 44 24 Q40 19 32 19 Q24 19 20 24Z" fill="#2b2f45"/>' +
    '<circle cx="27.5" cy="26" r="1.6" fill="#2b2f45"/><circle cx="36.5" cy="26" r="1.6" fill="#2b2f45"/>' +
    '<path d="M28 31 Q32 34 36 31" fill="none" stroke="#2b2f45" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M16 56 Q16 42 32 42 Q48 42 48 56Z" fill="#fff"/>' +
    '<path d="M32 42 L28 50 L32 53 L36 50Z" fill="#2f6bed"/>' +
    '</svg>';

  // ナビ項目（href はルート相対で持ち、ROOT を前置して各階層から正しく解決する）。
  // FX総合メディア化（門戸を広く）: FX全般→口座比較→ツール環境→プロップ(1カテゴリ)→税金→用語集。
  var NAV = [
    { href: "index.html", label: "ホーム" },
    { href: "guide/fx-hajimekata.html", label: "はじめてのFX" },
    { href: "guide/kokunai-kouza.html", label: "口座比較" },
    { href: "guide/vps.html", label: "ツール・環境" },
    { href: "tools/calculator.html", label: "計算ツール" },
    { href: "guide/ftmo.html", label: "プロップ" },
    { href: "guide/prop-yougo.html", label: "用語集" },
    { href: "guide/kokunai-kouza.html", label: "口座をさがす", cta: true },
  ];

  /**
   * Organization 構造化データを <head> に注入（E-E-A-T・運営者の実在性）。
   * links.js の site.baseUrl/name を使う（dist では publish.py が実URLへ置換済み）。
   * 既に Organization JSON-LD があるページでは二重注入しない。
   */
  function injectOrganization() {
    var base = (SITE.baseUrl || "").replace(/\/$/, "");
    if (!base) return;
    // 既存の Organization（単独エンティティ）があればスキップ。publisher内の参照は別物。
    var existing = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < existing.length; i++) {
      if (/"@type"\s*:\s*"Organization"[\s\S]*"logo"/.test(existing[i].textContent || "")) return;
    }
    var org = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE.name || "FXコンパス",
      url: base + "/",
      logo: base + "/images/apple-touch-icon.png",
      image: base + "/images/og-default.png",
      description: "FXの始め方・口座比較・取引ツール・税金・プロップファームを出典付きで整理するFX総合メディア。",
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(org);
    document.head.appendChild(s);
  }

  /** 免責バーを<body>先頭へ挿入。 */
  function renderDisclaimerBar() {
    var bar = document.createElement("div");
    bar.className = "disclaimer-bar";
    bar.innerHTML =
      DISCLAIMER_SHORT +
      ' <a href="' + ROOT + 'legal/disclaimer.html">免責</a> / ' +
      '<a href="' + ROOT + 'legal/pr-policy.html">広告掲載ポリシー</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // ヘッダロゴの方位磁針マーク（小型・白抜き）。
  var LOGO_MARK =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="1.6"/>' +
    '<polygon points="12,6 14,12 12,11 10,12" fill="#fff"/>' +
    '<polygon points="12,18 10,12 12,13 14,12" fill="#cdd7ff"/>' +
    '<circle cx="12" cy="12" r="1.4" fill="#fff"/></svg>';

  /** ヘッダ（サイト名 + ナビ）を <header id="siteHeader"> へ描画。 */
  function renderHeader() {
    var el = document.getElementById("siteHeader");
    if (!el) return;
    var name = esc(SITE.name || "FXコンパス");
    var navHtml = NAV.map(function (n) {
      return '<a class="' + (n.cta ? "cta" : "") + '" href="' + ROOT + n.href + '">' + esc(n.label) + "</a>";
    }).join("");
    el.innerHTML =
      '<div class="bar">' +
      '<a class="brand" href="' + ROOT + 'index.html">' +
      '<span class="logo-mark">' + LOGO_MARK + "</span>" +
      '<span class="brand-text"><b>' + name + "</b>" +
      '<span class="tagline">' + esc(SITE.tagline || "") + "</span></span>" +
      "</a>" +
      '<nav aria-label="メインナビ">' + navHtml + "</nav>" +
      "</div>";
  }

  /** フッタを <footer id="siteFooter"> へ描画。 */
  function renderFooter() {
    var el = document.getElementById("siteFooter");
    if (!el) return;
    el.innerHTML =
      '<div class="inner">' +
      '<div class="foot-nav">' +
      '<a href="' + ROOT + 'about.html">運営者情報・編集方針</a>' +
      '<a href="' + ROOT + 'guide/koushin-log.html">更新ログ</a>' +
      '<a href="' + ROOT + 'legal/disclaimer.html">免責事項</a>' +
      '<a href="' + ROOT + 'legal/pr-policy.html">広告掲載ポリシー</a>' +
      "</div>" +
      '<p class="foot-disclaimer">' +
      "本サイトは、FX（外国為替証拠金取引）の始め方・口座比較・取引ツール・税金・プロップファームなどの情報を、" +
      "出典付きで整理・比較するFX総合メディアです。" +
      "投資助言・売買推奨ではなく、特定の銘柄・通貨ペア・売買タイミングを推奨しません。" +
      "掲載するアフィリエイトリンクには「PR」と表記しています。各サービスの利用は自己責任でご判断ください。" +
      "</p>" +
      '<p class="foot-disclaimer">最終更新日: <span class="updated">' +
      esc(SITE.updated || "") +
      "</span> ／ &copy; " + esc(SITE.name || "FXコンパス") +
      "</p>" +
      "</div>";
  }

  /** 枠 a がページ key を対象にしているか（pages に "*" か key を含むか）。 */
  function affiliateMatchesPage(a, page) {
    if (!page) return true;                       // ページ指定なし=従来どおり全枠（後方互換）
    var pages = a.pages;
    if (!Array.isArray(pages) || pages.length === 0) return true; // pages未設定は全ページ扱い
    return pages.indexOf("*") !== -1 || pages.indexOf(page) !== -1;
  }

  /**
   * アフィリ/note導線を描画する。引数のidの要素へ。
   * links.js（window.PROPNAVI）のプレースホルダを読む。URL未設定枠は「準備中」表示。
   *
   * opts.page を渡すと、各枠の pages 配列に一致する枠だけを描画する（全ページ同一羅列をやめる）。
   * slot="primary" を先に、slot="always"（TradingView等の常設サブ）を後に並べる。
   */
  function renderPromos(elId, opts) {
    var el = document.getElementById(elId || "promos");
    if (!el) return;
    opts = opts || {};
    var includeNote = opts.includeNote !== false;
    var page = opts.page || "";

    // ページに関連する枠だけを抽出し、primary→always の順に並べる。
    var matched = (CFG.affiliates || []).filter(function (a) {
      return affiliateMatchesPage(a, page);
    });
    var ordered = matched
      .filter(function (a) { return a.slot !== "always"; })
      .concat(matched.filter(function (a) { return a.slot === "always"; }));

    var rows = "";
    ordered.forEach(function (a) {
      rows += promoRow(a.label, a.note, a.url, a.bannerHtml);
    });
    if (includeNote && CFG.note) {
      rows += promoRow(CFG.note.label, CFG.note.note, CFG.note.url);
    }
    if (!rows) return;   // 対象枠が皆無なら何も描画しない（空のブロックを出さない）

    el.className = "promo-block";
    el.innerHTML =
      '<div class="head">このページに関連するサービス</div>' +
      rows +
      '<p class="basis">国内で合法に扱える高単価サービス（FX用VPS・国内FX/CFD・チャートツール等）を中心に、' +
      "プロップは審査済みの社のみを掲載しています。海外FXブローカーのアフィリは扱いません。" +
      "リンクは広告（PR）です。各社の利用は自己責任でご判断ください。</p>";
  }

  function promoRow(label, note, url, bannerHtml) {
    var hasUrl = url && String(url).trim() !== "";
    var cta = hasUrl
      ? '<a class="promo-cta" href="' + escAttr(url) + '" target="_blank" rel="nofollow sponsored noopener">公式サイト</a>'
      : '<span class="promo-cta disabled">準備中</span>';
    // ASPバナー（リンクコード改変禁止のため、貼られた広告コードは無加工で出す）
    var banner = bannerHtml && String(bannerHtml).trim() !== ""
      ? '<div class="promo-banner">' + bannerHtml + "</div>"
      : "";
    return (
      '<div class="promo-row">' +
      '<span class="pr-inline">PR</span>' +
      '<div class="promo-main">' +
      '<div class="promo-label">' + esc(label) + "</div>" +
      '<div class="promo-note">' + esc(note) + "</div>" +
      "</div>" +
      cta +
      "</div>" +
      banner
    );
  }

  /**
   * マスコット「コンパスくん」の吹き出しHTMLを返す（記事中に差し込む用）。
   *   PropNavi.mascotSay("…") を innerHTML 等で使う。
   */
  function mascotSay(text, who) {
    return (
      '<div class="mascot-say">' +
      '<span class="avatar">' + MASCOT_SVG + "</span>" +
      '<div class="bubble"><span class="who">' + esc(who || "コンパスくん") + "</span>" +
      "<p>" + esc(text) + "</p></div></div>"
    );
  }

  /** data-mascot-say 属性を持つ要素を吹き出しに変換（HTMLを書かずに使える簡便版）。 */
  function hydrateMascots() {
    var nodes = document.querySelectorAll("[data-mascot-say]");
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].getAttribute("data-mascot-say");
      var w = nodes[i].getAttribute("data-mascot-who") || "コンパスくん";
      nodes[i].outerHTML = mascotSay(t, w);
    }
  }

  /** 編集長カイの署名カードHTML（記事末のE-E-A-T用）。 */
  function authorCard() {
    return (
      '<div class="author-card">' +
      '<div class="face">' + EDITOR_SVG + "</div>" +
      '<div class="who"><div class="role">編集長</div><div class="name">カイ</div>' +
      "<p>FX・マクロ経済の分析を背景に持つ個人運営の編集長。「勝てる手法」は約束せず、" +
      "一次情報の確認・出典の明示・誇張しないことを編集方針に、FXの“地図”を正確に描き続けます。</p></div></div>"
    );
  }

  /** data-author-card 属性を持つ要素を編集長カードに変換。 */
  function hydrateAuthorCards() {
    var nodes = document.querySelectorAll("[data-author-card]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].innerHTML = authorCard();
    }
  }

  /** ページ初期化のまとめ呼び出し。 */
  function init(opts) {
    injectOrganization();
    renderDisclaimerBar();
    renderHeader();
    renderFooter();
    hydrateMascots();
    hydrateAuthorCards();
    if (opts && opts.promos) renderPromos(opts.promos, opts);
  }

  root.PropNavi = {
    ROOT: ROOT,
    DISCLAIMER_SHORT: DISCLAIMER_SHORT,
    MASCOT_SVG: MASCOT_SVG,
    EDITOR_SVG: EDITOR_SVG,
    mascotSay: mascotSay,
    authorCard: authorCard,
    init: init,
    renderHeader: renderHeader,
    renderFooter: renderFooter,
    renderDisclaimerBar: renderDisclaimerBar,
    renderPromos: renderPromos,
    esc: esc,
  };
})(window);

/*
 * site.js — プロップナビ 共通の描画部品（ヘッダ/フッタ/免責バー/アフィリ導線）
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

  // ナビ項目（href はルート相対で持ち、ROOT を前置して各階層から正しく解決する）。
  // 戦略v2: プロップ集客＋実務インフラ（VPS/国内口座/チャート）＋計算ツールへ導く構成。
  var NAV = [
    { href: "index.html", label: "ホーム" },
    { href: "guide/vps.html", label: "VPS" },
    { href: "guide/kokunai-kouza.html", label: "国内口座" },
    { href: "guide/tradingview.html", label: "チャート" },
    { href: "guide/shikin-kanri.html", label: "資金管理" },
    { href: "tools/calculator.html", label: "計算ツール" },
    { href: "guide/erabikata.html", label: "選び方" },
    { href: "guide/prop-yougo.html", label: "用語集" },
    { href: "about.html", label: "運営者" },
  ];

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

  /** ヘッダ（サイト名 + ナビ）を <header id="siteHeader"> へ描画。 */
  function renderHeader() {
    var el = document.getElementById("siteHeader");
    if (!el) return;
    var navHtml = NAV.map(function (n) {
      return '<a href="' + ROOT + n.href + '">' + esc(n.label) + "</a>";
    }).join("");
    el.innerHTML =
      '<div class="bar">' +
      '<a class="brand" href="' + ROOT + 'index.html">' +
      esc(SITE.name || "プロップナビ") +
      '<span class="tagline">' + esc(SITE.tagline || "") + "</span>" +
      "</a>" +
      "<nav>" + navHtml + "</nav>" +
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
      "本サイトは、プロップファーム（取引資金提供業者）のルールや事実情報を整理・比較する情報メディアです。" +
      "投資助言・売買推奨ではなく、特定の銘柄・通貨ペア・売買タイミングを推奨しません。" +
      "掲載するアフィリエイトリンクには「PR」と表記しています。各サービスの利用は自己責任でご判断ください。" +
      "</p>" +
      '<p class="foot-disclaimer">最終更新日: <span class="updated">' +
      esc(SITE.updated || "") +
      "</span> ／ &copy; " + esc(SITE.name || "プロップナビ") +
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

  /** ページ初期化のまとめ呼び出し。 */
  function init(opts) {
    renderDisclaimerBar();
    renderHeader();
    renderFooter();
    if (opts && opts.promos) renderPromos(opts.promos, opts);
  }

  root.PropNavi = {
    ROOT: ROOT,
    DISCLAIMER_SHORT: DISCLAIMER_SHORT,
    init: init,
    renderHeader: renderHeader,
    renderFooter: renderFooter,
    renderDisclaimerBar: renderDisclaimerBar,
    renderPromos: renderPromos,
    esc: esc,
  };
})(window);

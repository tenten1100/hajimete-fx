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
  var NAV = [
    { href: "index.html", label: "ホーム" },
    { href: "guide/ftmo.html", label: "FTMO" },
    { href: "guide/erabikata.html", label: "選び方" },
    { href: "guide/challenge-rules.html", label: "ルール" },
    { href: "guide/shikin-kessai-hou.html", label: "資金決済法" },
    { href: "tools/calculator.html", label: "計算ツール" },
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

  /**
   * アフィリ/note導線を描画する。引数のidの要素へ。
   * links.js（window.PROPNAVI）のプレースホルダを読む。URL未設定枠は「準備中」表示。
   */
  function renderPromos(elId, opts) {
    var el = document.getElementById(elId || "promos");
    if (!el) return;
    opts = opts || {};
    var includeNote = opts.includeNote !== false;

    var rows = "";
    (CFG.affiliates || []).forEach(function (a) {
      rows += promoRow(a.label, a.note, a.url);
    });
    if (includeNote && CFG.note) {
      rows += promoRow(CFG.note.label, CFG.note.note, CFG.note.url);
    }

    el.className = "promo-block";
    el.innerHTML =
      '<div class="head">関連リンク</div>' +
      rows +
      '<p class="basis">掲載先は「親会社が規制ブローカー・支払い実績が透明・運営3年以上」を満たす社のみを選定しています。' +
      "リンクは広告（PR）です。各社の利用は自己責任でご判断ください。</p>";
  }

  function promoRow(label, note, url) {
    var hasUrl = url && String(url).trim() !== "";
    var cta = hasUrl
      ? '<a class="promo-cta" href="' + escAttr(url) + '" target="_blank" rel="nofollow sponsored noopener">公式サイト</a>'
      : '<span class="promo-cta disabled">準備中</span>';
    return (
      '<div class="promo-row">' +
      '<span class="pr-inline">PR</span>' +
      '<div class="promo-main">' +
      '<div class="promo-label">' + esc(label) + "</div>" +
      '<div class="promo-note">' + esc(note) + "</div>" +
      "</div>" +
      cta +
      "</div>"
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

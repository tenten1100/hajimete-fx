/*
 * site.js — FXコンパス v5 (Agency-Grade)
 *
 * Shared rendering: header, footer, disclaimer bar, affiliate promos.
 * Interactivity: hamburger nav, scroll animations, reading progress,
 *   header shadow, counter animation, smooth scroll.
 *
 * No external CDN, analytics, or runtime API calls.
 */

(function (root) {
  "use strict";

  var CFG = root.PROPNAVI || {};
  var SITE = CFG.site || {};

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

  /* ─── SVG Assets ─── */

  var MASCOT_SVG =
    '<svg viewBox="0 0 120 120" role="img" aria-label="コンパスくん">' +
    '<defs><linearGradient id="cmg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#0284c7"/></linearGradient></defs>' +
    '<circle cx="60" cy="62" r="46" fill="url(#cmg)"/>' +
    '<circle cx="60" cy="62" r="37" fill="#fff"/>' +
    '<circle cx="60" cy="62" r="37" fill="none" stroke="#e2e8f0" stroke-width="2"/>' +
    '<circle cx="60" cy="30" r="2.4" fill="#94a3b8"/><circle cx="60" cy="94" r="2.4" fill="#94a3b8"/>' +
    '<circle cx="28" cy="62" r="2.4" fill="#94a3b8"/><circle cx="92" cy="62" r="2.4" fill="#94a3b8"/>' +
    '<polygon points="60,40 66,62 60,58 54,62" fill="#f97316"/>' +
    '<polygon points="60,84 54,62 60,66 66,62" fill="#0f172a"/>' +
    '<circle cx="60" cy="62" r="4" fill="#0f172a"/>' +
    '<circle cx="49" cy="58" r="3.2" fill="#0f172a"/><circle cx="71" cy="58" r="3.2" fill="#0f172a"/>' +
    '<path d="M52 70 Q60 76 68 70" fill="none" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="44" cy="66" r="3" fill="#fbbf24" opacity=".6"/><circle cx="76" cy="66" r="3" fill="#fbbf24" opacity=".6"/>' +
    '</svg>';

  var EDITOR_SVG =
    '<svg viewBox="0 0 64 64" role="img" aria-label="編集長カイ">' +
    '<defs><linearGradient id="edg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#0284c7"/></linearGradient></defs>' +
    '<rect width="64" height="64" rx="16" fill="url(#edg)"/>' +
    '<circle cx="32" cy="26" r="12" fill="#ffe0c2"/>' +
    '<path d="M20 24 Q22 12 32 12 Q42 12 44 24 Q40 19 32 19 Q24 19 20 24Z" fill="#1e293b"/>' +
    '<circle cx="27.5" cy="26" r="1.6" fill="#1e293b"/><circle cx="36.5" cy="26" r="1.6" fill="#1e293b"/>' +
    '<path d="M28 31 Q32 34 36 31" fill="none" stroke="#1e293b" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M16 56 Q16 42 32 42 Q48 42 48 56Z" fill="#fff"/>' +
    '<path d="M32 42 L28 50 L32 53 L36 50Z" fill="#f97316"/>' +
    '</svg>';

  var LOGO_MARK =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<polygon points="12,6 14,12 12,11 10,12" fill="#f97316"/>' +
    '<polygon points="12,18 10,12 12,13 14,12" fill="currentColor"/>' +
    '<circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>';

  /* ─── Navigation ─── */

  var NAV = [
    { href: "index.html", label: "ホーム" },
    { href: "guide/fx-hajimekata.html", label: "はじめてのFX" },
    { href: "guide/kouza-ranking.html", label: "口座比較" },
    { href: "guide/spread-hikaku.html", label: "スプレッド" },
    { href: "guide/vps.html", label: "ツール・環境" },
    { href: "tools/calculator.html", label: "計算ツール" },
    { href: "guide/ftmo.html", label: "プロップ" },
    { href: "guide/kouza-ranking.html", label: "口座をさがす", cta: true },
  ];

  /* ─── Organization JSON-LD ─── */

  function injectOrganization() {
    var base = (SITE.baseUrl || "").replace(/\/$/, "");
    if (!base) return;
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

  /* ─── Disclaimer Bar ─── */

  function renderDisclaimerBar() {
    var bar = document.createElement("div");
    bar.className = "disclaimer-bar";
    bar.innerHTML =
      DISCLAIMER_SHORT +
      ' <a href="' + ROOT + 'legal/disclaimer.html">免責</a> / ' +
      '<a href="' + ROOT + 'legal/pr-policy.html">広告掲載ポリシー</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  /* ─── Header with Hamburger ─── */

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
      '<nav id="mainNav" aria-label="メインナビ">' + navHtml + "</nav>" +
      '<button class="hamburger" id="hamburgerBtn" aria-label="メニュー" aria-expanded="false">' +
      "<span></span><span></span><span></span>" +
      "</button>" +
      "</div>" +
      '<div class="nav-overlay" id="navOverlay"></div>';

    initHamburger();
    initHeaderScroll(el);
  }

  function initHamburger() {
    var btn = document.getElementById("hamburgerBtn");
    var nav = document.getElementById("mainNav");
    var overlay = document.getElementById("navOverlay");
    if (!btn || !nav) return;

    function toggle(open) {
      var isOpen = typeof open === "boolean" ? open : !nav.classList.contains("open");
      nav.classList.toggle("open", isOpen);
      btn.classList.toggle("active", isOpen);
      btn.setAttribute("aria-expanded", isOpen);
      document.body.classList.toggle("menu-open", isOpen);
      if (overlay) overlay.classList.toggle("show", isOpen);
    }

    btn.addEventListener("click", function () { toggle(); });
    if (overlay) overlay.addEventListener("click", function () { toggle(false); });

    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { toggle(false); });
    });
  }

  function initHeaderScroll(header) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          header.classList.toggle("scrolled", window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ─── Footer ─── */

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
      "</p></div>";
  }

  /* ─── Affiliate Promos ─── */

  function affiliateMatchesPage(a, page) {
    if (!page) return true;
    var pages = a.pages;
    if (!Array.isArray(pages) || pages.length === 0) return true;
    return pages.indexOf("*") !== -1 || pages.indexOf(page) !== -1;
  }

  var CTA_COPY = {
    "kokunai-fx": { text: "無料で口座開設", micro: "最短5分・維持費0円" },
    "kokunai-cfd": { text: "無料で口座開設", micro: "最短5分・維持費0円" },
    "vps":        { text: "プランを見る",   micro: "初月無料あり" },
    "chart":      { text: "無料で始める",   micro: "有料プランは30日返金保証" },
    "prop":       { text: "公式サイトへ",   micro: "" },
    "crypto":     { text: "無料で口座開設", micro: "最短10分" },
  };

  var BANNER_STYLE = {
    "prop":       { bg: "linear-gradient(135deg,#1a1a2e,#16213e)", text: "チャレンジに挑戦する →" },
    "chart":      { bg: "linear-gradient(135deg,#2962FF,#1E88E5)", text: "無料で始める →" },
  };

  function promoRow(label, note, url, bannerHtml, category) {
    var hasUrl = url && String(url).trim() !== "";
    var copy = CTA_COPY[category] || { text: "公式サイトへ", micro: "" };
    var microHtml = copy.micro ? '<span class="micro">' + esc(copy.micro) + "</span>" : "";
    var cta = hasUrl
      ? '<a class="promo-cta" href="' + escAttr(url) + '" target="_blank" rel="nofollow sponsored noopener">' + esc(copy.text) + microHtml + "</a>"
      : '<span class="promo-cta disabled">準備中</span>';
    var banner = "";
    if (bannerHtml && String(bannerHtml).trim() !== "") {
      banner = '<div class="promo-banner">' + bannerHtml + "</div>";
    } else if (hasUrl && BANNER_STYLE[category]) {
      var bs = BANNER_STYLE[category];
      banner = '<div class="promo-banner"><a href="' + escAttr(url) + '" target="_blank" rel="nofollow sponsored noopener" class="promo-btn-banner" style="background:' + bs.bg + ';">' + esc(label.split("（")[0]) + " — " + esc(bs.text) + "</a></div>";
    }
    return (
      '<div class="promo-row">' +
      '<span class="pr-inline">PR</span>' +
      '<div class="promo-main">' +
      '<div class="promo-label">' + esc(label) + "</div>" +
      '<div class="promo-note">' + esc(note) + "</div>" +
      "</div>" + cta + "</div>" + banner
    );
  }

  function renderPromos(elId, opts) {
    var el = document.getElementById(elId || "promos");
    if (!el) return;
    opts = opts || {};
    var includeNote = opts.includeNote !== false;
    var page = opts.page || "";

    var matched = (CFG.affiliates || []).filter(function (a) {
      return affiliateMatchesPage(a, page);
    });
    var ordered = matched
      .filter(function (a) { return a.slot !== "always"; })
      .concat(matched.filter(function (a) { return a.slot === "always"; }));

    var rows = "";
    ordered.forEach(function (a) {
      rows += promoRow(a.label, a.note, a.url, a.bannerHtml, a.category);
    });
    if (includeNote && CFG.note && CFG.note.url) {
      rows += promoRow(CFG.note.label, CFG.note.note, CFG.note.url, CFG.note.bannerHtml, "");
    }
    if (!rows) return;

    el.className = "promo-block";
    el.innerHTML =
      '<div class="head">このページに関連するサービス</div>' +
      rows +
      '<p class="basis">国内で合法に扱える高単価サービス（FX用VPS・国内FX/CFD・チャートツール等）を中心に、' +
      "プロップは審査済みの社のみを掲載しています。海外FXブローカーのアフィリは扱いません。" +
      "リンクは広告（PR）です。各社の利用は自己責任でご判断ください。</p>";
  }

  /* ─── Mascot / Author ─── */

  function mascotSay(text, who) {
    return (
      '<div class="mascot-say">' +
      '<span class="avatar">' + MASCOT_SVG + "</span>" +
      '<div class="bubble"><span class="who">' + esc(who || "コンパスくん") + "</span>" +
      "<p>" + esc(text) + "</p></div></div>"
    );
  }

  function hydrateMascots() {
    var nodes = document.querySelectorAll("[data-mascot-say]");
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].getAttribute("data-mascot-say");
      var w = nodes[i].getAttribute("data-mascot-who") || "コンパスくん";
      nodes[i].outerHTML = mascotSay(t, w);
    }
  }

  function authorCard() {
    return (
      '<div class="author-card">' +
      '<div class="face">' + EDITOR_SVG + "</div>" +
      '<div class="who"><div class="role">編集長</div><div class="name">カイ</div>' +
      "<p>FX・マクロ経済の分析を背景に持つ個人運営の編集長。「勝てる手法」は約束せず、" +
      "一次情報の確認・出典の明示・誇張しないことを編集方針に、FXの\u201C地図\u201Dを正確に描き続けます。</p></div></div>"
    );
  }

  function hydrateAuthorCards() {
    var nodes = document.querySelectorAll("[data-author-card]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].innerHTML = authorCard();
    }
  }

  /* ─── Scroll Animations (IntersectionObserver) ─── */

  function initScrollAnimations() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale").forEach(function (el) {
        el.classList.add("visible");
      });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

    document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale").forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ─── Reading Progress Bar ─── */

  function initReadingProgress() {
    var bar = document.querySelector(".reading-progress");
    if (!bar) return;
    var article = document.querySelector("article");
    if (!article) return;

    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var rect = article.getBoundingClientRect();
          var total = article.scrollHeight - window.innerHeight;
          var scrolled = -rect.top;
          var pct = Math.min(Math.max(scrolled / total * 100, 0), 100);
          bar.style.width = pct + "%";
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ─── Counter Animation ─── */

  function initCounters() {
    var counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;
    if (!("IntersectionObserver" in window)) {
      counters.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    counters.forEach(function (el) { observer.observe(el); });
  }

  function animateCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    var duration = 1800;
    var start = performance.now();

    function elasticOut(t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
    }

    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var eased = elasticOut(progress);
      var current = Math.round(target * eased);
      el.textContent = prefix + current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
      if (progress >= 1) {
        el.style.transform = "scale(1.15)";
        el.style.transition = "transform .3s cubic-bezier(.34,1.56,.64,1)";
        setTimeout(function () { el.style.transform = "scale(1)"; }, 150);
      }
    }
    requestAnimationFrame(step);
  }

  /* ─── Smooth Scroll for Anchor Links ─── */

  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var headerH = document.querySelector(".site-header");
      var offset = headerH ? headerH.offsetHeight + 16 : 16;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  }

  /* ─── 3D Card Tilt ─── */

  function initCardTilt() {
    if (window.matchMedia("(hover: none)").matches) return;
    var cards = document.querySelectorAll(".featured, .guide-card, .step-card, .side-card");
    cards.forEach(function (card) {
      card.style.transition = "transform .4s cubic-bezier(.03,.98,.52,.99), box-shadow .4s ease";
      card.style.transformStyle = "preserve-3d";
      card.style.willChange = "transform";

      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        var tiltX = y * -8;
        var tiltY = x * 8;
        card.style.transform = "perspective(600px) rotateX(" + tiltX + "deg) rotateY(" + tiltY + "deg) scale(1.02)";
        card.style.boxShadow = (x * -20) + "px " + (y * -20) + "px 40px rgba(0,0,0,.1), 0 8px 32px rgba(0,0,0,.08)";
      });

      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
        card.style.boxShadow = "";
      });
    });
  }

  /* ─── Magnetic Buttons ─── */

  function initMagneticButtons() {
    if (window.matchMedia("(hover: none)").matches) return;
    var btns = document.querySelectorAll(".btn, .chip");
    btns.forEach(function (btn) {
      btn.style.transition = "transform .3s cubic-bezier(.03,.98,.52,.99), background .3s ease, color .3s ease, border-color .3s ease, box-shadow .3s ease";
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = "translate(" + (x * 0.15) + "px, " + (y * 0.15) + "px) scale(1.05)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  /* ─── Cursor Glow on Cards ─── */

  function initCursorGlow() {
    if (window.matchMedia("(hover: none)").matches) return;
    var cards = document.querySelectorAll(".post-list a, .guide-card, .featured");
    cards.forEach(function (card) {
      var glow = document.createElement("div");
      glow.style.cssText = "position:absolute;width:200px;height:200px;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .3s;background:radial-gradient(circle,rgba(249,115,22,.12) 0%,transparent 70%);z-index:0;";
      card.style.position = "relative";
      card.style.overflow = "hidden";
      card.appendChild(glow);

      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        glow.style.left = (e.clientX - rect.left - 100) + "px";
        glow.style.top = (e.clientY - rect.top - 100) + "px";
        glow.style.opacity = "1";
      });
      card.addEventListener("mouseleave", function () {
        glow.style.opacity = "0";
      });
    });
  }

  /* ─── Hero Parallax ─── */

  function initHeroParallax() {
    var hero = document.querySelector(".portal-hero");
    if (!hero) return;
    var shapes = hero.querySelectorAll(".shape");
    var art = hero.querySelector(".hero-art");
    var copy = hero.querySelector(".hero-copy");
    var ticking = false;

    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var scrolled = window.scrollY;
          var heroH = hero.offsetHeight;
          if (scrolled < heroH * 1.5) {
            var ratio = scrolled / heroH;
            shapes.forEach(function (s, i) {
              var speed = 0.3 + i * 0.15;
              s.style.transform = "translateY(" + (scrolled * speed) + "px) scale(" + (1 - ratio * 0.1) + ")";
            });
            if (art) art.style.transform = "translateY(" + (scrolled * 0.2) + "px)";
            if (copy) copy.style.transform = "translateY(" + (scrolled * 0.08) + "px)";
            hero.style.opacity = 1 - ratio * 0.4;
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ─── Mascot Wobble on Hover ─── */

  function initMascotWobble() {
    var mascots = document.querySelectorAll(".hero-art, .mascot-figure .m");
    mascots.forEach(function (m) {
      m.addEventListener("mouseenter", function () {
        m.style.animation = "none";
        void m.offsetWidth;
        m.style.animation = "mascotWobble .6s cubic-bezier(.36,1.56,.64,1) both";
      });
    });
    var style = document.createElement("style");
    style.textContent = "@keyframes mascotWobble { 0% { transform: rotate(0); } 25% { transform: rotate(-8deg) scale(1.1); } 50% { transform: rotate(6deg); } 75% { transform: rotate(-3deg); } 100% { transform: rotate(0) scale(1); } }";
    document.head.appendChild(style);
  }

  /* ─── Scroll Progress Bar ─── */

  function initScrollProgress() {
    var bar = document.createElement("div");
    bar.style.cssText = "position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,#f97316,#fbbf24,#f97316);z-index:10000;transition:width .1s linear;pointer-events:none;border-radius:0 2px 2px 0;";
    document.body.appendChild(bar);

    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var scrollH = document.documentElement.scrollHeight - window.innerHeight;
          var pct = scrollH > 0 ? (window.scrollY / scrollH) * 100 : 0;
          bar.style.width = pct + "%";
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ─── Stagger Post List Items with Bounce ─── */

  function initPostListStagger() {
    var items = document.querySelectorAll(".post-list li");
    if (!items.length || !("IntersectionObserver" in window)) return;
    items.forEach(function (li) {
      li.style.opacity = "0";
      li.style.transform = "translateY(30px) scale(.97)";
      li.style.transition = "opacity .7s cubic-bezier(.19,1,.22,1), transform .7s cubic-bezier(.19,1,.22,1)";
    });

    var observer = new IntersectionObserver(function (entries) {
      var visibleItems = [];
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visibleItems.push(entry.target);
          observer.unobserve(entry.target);
        }
      });
      visibleItems.forEach(function (item, i) {
        setTimeout(function () {
          item.style.opacity = "1";
          item.style.transform = "translateY(0) scale(1)";
        }, i * 80);
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });

    items.forEach(function (li) { observer.observe(li); });
  }

  /* ─── Init ─── */

  function init(opts) {
    injectOrganization();
    renderDisclaimerBar();
    renderHeader();
    renderFooter();
    hydrateMascots();
    hydrateAuthorCards();
    if (opts && opts.promos) renderPromos(opts.promos, opts);

    initScrollAnimations();
    initReadingProgress();
    initCounters();
    initSmoothScroll();
    initCardTilt();
    initMagneticButtons();
    initCursorGlow();
    initHeroParallax();
    initMascotWobble();
    initScrollProgress();
    initPostListStagger();
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

/*
 * chart.js — Canvas API による最小折れ線描画（外部ライブラリなし）
 *
 * 方針（PROJECT.md Stage 4a）:
 *   - Chart.js 等のCDN/同梱を避け、依存ゼロを維持する（R5プラットフォーム規約リスク縮小）。
 *   - データ0件/1件でも描画が壊れないこと。
 *   - 描く対象は「累計損益の推移」と「目標ライン / 最大DDライン」のみ。売買助言は描かない。
 */

(function (root) {
  "use strict";

  /**
   * 折れ線グラフを描く。
   * @param {HTMLCanvasElement} canvas 描画先
   * @param {Object} opts
   *   series      数値配列（累計損益の推移。古い順）
   *   targetLine  目標ラインの値（省略可）
   *   maxDdLine   最大DD下限ラインの値（マイナス想定。省略可）
   *   labels      X軸ラベル配列（省略可）
   */
  function drawLine(canvas, opts) {
    opts = opts || {};
    var series = Array.isArray(opts.series) ? opts.series.map(Number) : [];
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 高DPI対応: CSS表示サイズに合わせて内部解像度を上げる。
    var ratio = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || 600;
    var cssH = canvas.clientHeight || 240;
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var padL = 56, padR = 16, padT = 16, padB = 28;
    var plotW = Math.max(1, cssW - padL - padR);
    var plotH = Math.max(1, cssH - padT - padB);

    // 値域を決める。series・各ラインから min/max を取り、0を必ず含める。
    var values = series.slice();
    if (typeof opts.targetLine === "number" && isFinite(opts.targetLine)) values.push(opts.targetLine);
    if (typeof opts.maxDdLine === "number" && isFinite(opts.maxDdLine)) values.push(opts.maxDdLine);
    values.push(0);
    var minV = Math.min.apply(null, values);
    var maxV = Math.max.apply(null, values);
    if (minV === maxV) {                 // データが全部同値/空のときの保険
      minV -= 1;
      maxV += 1;
    }
    var span = maxV - minV;

    function x(i, n) {
      if (n <= 1) return padL + plotW / 2;     // 1点だけのときは中央に置く
      return padL + (plotW * i) / (n - 1);
    }
    function y(v) {
      return padT + plotH * (1 - (v - minV) / span);
    }

    // 背景の枠とゼロ基準線。
    ctx.strokeStyle = "#d0d5dd";
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    // Y軸の目盛り（min / 0 / max）。
    ctx.fillStyle = "#667085";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    [minV, 0, maxV].forEach(function (v) {
      var yy = y(v);
      ctx.strokeStyle = v === 0 ? "#98a2b3" : "#eaecf0";
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(Math.round(v).toLocaleString(), padL - 6, yy);
    });

    // 目標ライン（緑の破線）。
    if (typeof opts.targetLine === "number" && isFinite(opts.targetLine)) {
      drawDashed(ctx, padL, padL + plotW, y(opts.targetLine), "#12b76a");
    }
    // 最大DDライン（赤の破線）。
    if (typeof opts.maxDdLine === "number" && isFinite(opts.maxDdLine)) {
      drawDashed(ctx, padL, padL + plotW, y(opts.maxDdLine), "#f04438");
    }

    // 本体の折れ線。データが空なら線は描かず枠だけ残す。
    if (series.length > 0) {
      ctx.strokeStyle = "#1570ef";
      ctx.lineWidth = 2;
      ctx.beginPath();
      series.forEach(function (v, i) {
        var px = x(i, series.length);
        var py = y(v);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // 各点に小さな丸。
      ctx.fillStyle = "#1570ef";
      series.forEach(function (v, i) {
        ctx.beginPath();
        ctx.arc(x(i, series.length), y(v), 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.fillStyle = "#98a2b3";
      ctx.textAlign = "center";
      ctx.fillText("データがまだありません", padL + plotW / 2, padT + plotH / 2);
    }
  }

  function drawDashed(ctx, x1, x2, yy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, yy);
    ctx.lineTo(x2, yy);
    ctx.stroke();
    ctx.restore();
  }

  root.PropChart = { drawLine: drawLine };
})(window);

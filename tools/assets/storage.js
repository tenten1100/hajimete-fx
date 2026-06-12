/*
 * storage.js — localStorage の薄いラッパ
 *
 * 方針（PROJECT.md Stage 4a）:
 *   - 入力値・日次損益ログは個人端末ローカルで完結。サーバ/認証/個人情報の預かりなし。
 *   - localStorageが無効（プライベートモード等）でもツールが落ちないようフォールバックする。
 *     その場合はメモリ上の一時オブジェクトに退避し、リロードで消える（保存はされない）。
 */

(function (root) {
  "use strict";

  // localStorageが使えるか実際に書いて確かめる（存在しても例外を投げる環境がある）。
  var available = (function () {
    try {
      var k = "__prop_tools_test__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  // フォールバック用のメモリストア（localStorage不可時）。
  var memory = {};

  function get(key, fallback) {
    try {
      var raw = available ? window.localStorage.getItem(key) : memory[key];
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    var raw = JSON.stringify(value);
    try {
      if (available) {
        window.localStorage.setItem(key, raw);
      } else {
        memory[key] = raw;
      }
      return true;
    } catch (e) {
      // 容量超過などで失敗してもツールは動かし続ける。
      memory[key] = raw;
      return false;
    }
  }

  root.PropStore = {
    available: available,
    get: get,
    set: set,
    // 画面間で共有するキー名は1か所に集約しておく（タイプミス事故防止）。
    KEYS: {
      INPUTS: "prop_tools_inputs_v1",     // index.html の入力値
      DAILY: "prop_tools_daily_v1",       // tracker.html の日次損益ログ
    },
  };
})(window);

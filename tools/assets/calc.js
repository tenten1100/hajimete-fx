/*
 * calc.js — プロップチャレンジ資金管理の純粋計算ロジック
 *
 * このファイルはDOMに一切依存しない純関数のみ。
 * ブラウザ（window）と Node（module.exports）の両方から読めるようにし、
 * Node 側で `node --test` による検証ができる構造にしている。
 *
 * 重要（PROJECT.md Stage 3 R1 ハード条件）:
 *   ここには「売買タイミング・通貨ペア推奨・エントリー判断」を一切含めない。
 *   扱うのは資金管理の算術（損失上限・ロット目安・必要勝率）だけ。
 *
 * 設計方針（funnel_engine.py と整合）:
 *   - ベンチマーク/倍率は引数 or config 経由で差し替え可能にし、直書きしない。
 *   - 境界値（残余地0・残日数1・0除算）でNaN/Infinityに破綻させない。
 */

(function (root) {
  "use strict";

  // ---------------------------------------------------------------------------
  // 小さなヘルパ
  // ---------------------------------------------------------------------------

  /** 数値に丸める。不正値は fallback（既定0）にする。Infinity/NaNを外に出さない。 */
  function num(v, fallback) {
    var n = Number(v);
    if (!isFinite(n)) return fallback === undefined ? 0 : fallback;
    return n;
  }

  /** 小数を桁数指定で丸める（表示用の事故防止。計算途中では使わない）。 */
  function round(v, digits) {
    var p = Math.pow(10, digits === undefined ? 2 : digits);
    return Math.round(num(v) * p) / p;
  }

  // ---------------------------------------------------------------------------
  // コア計算
  // ---------------------------------------------------------------------------

  /**
   * 入力（口座サイズ＋各ルール%）から、資金管理の基本指標を算出する。
   *
   * @param {Object} input
   *   accountSize      口座サイズ（通貨単位はUI側で持つ。ここでは数値のみ）
   *   profitTargetPct  利益目標%（口座サイズに対する）
   *   dailyDdPct       日次ドローダウン上限%
   *   maxDdPct         最大ドローダウン上限%
   *   daysLeft         残り日数
   *   riskPerTradePct  1トレード許容リスク%
   * @param {Object} cfg 差し替え可能なベンチマーク（safetyFactor 等）。省略可。
   * @returns {Object} 算出結果。すべて有限値を保証する。
   */
  function computeBasics(input, cfg) {
    cfg = cfg || {};
    var safetyFactor = num(cfg.safetyFactor, 0.5);

    var account = Math.max(0, num(input.accountSize));
    var profitPct = Math.max(0, num(input.profitTargetPct));
    var dailyDdPct = Math.max(0, num(input.dailyDdPct));
    var maxDdPct = Math.max(0, num(input.maxDdPct));
    var daysLeft = Math.max(0, num(input.daysLeft));
    var riskPct = Math.max(0, num(input.riskPerTradePct));

    // 各ルールを金額に変換（%は口座サイズ基準）。
    var profitTargetAmount = account * (profitPct / 100);
    var dailyLossLimit = account * (dailyDdPct / 100);   // 今日許される最大損失額
    var maxLossLimit = account * (maxDdPct / 100);       // チャレンジ全体で許される最大損失額
    var riskPerTradeAmount = account * (riskPct / 100);  // 1トレードで取るリスク額

    // 安全ロット目安: 1トレードのリスク額を、日次損失上限の safetyFactor 倍で頭打ちにする。
    // 「1トレードで日次余地を使い切らない」ための保守的な上限。
    var safeRiskPerTrade = Math.min(riskPerTradeAmount, dailyLossLimit * safetyFactor);

    // 今日はあと何回負けられるか: 日次損失上限 ÷ 1トレードのリスク額。
    // riskが0なら無限に負けられる扱いは不適切なので、0として扱う（リスク未設定）。
    var lossesAllowedToday =
      riskPerTradeAmount > 0 ? Math.floor(dailyLossLimit / riskPerTradeAmount) : 0;

    // 1日あたりに必要な平均利益（残日数で目標を割る）。残日数0は当日扱い(=1)で割る。
    var perDayProfitNeeded = profitTargetAmount / Math.max(1, daysLeft);

    return {
      account: account,
      profitTargetAmount: profitTargetAmount,
      dailyLossLimit: dailyLossLimit,
      maxLossLimit: maxLossLimit,
      riskPerTradeAmount: riskPerTradeAmount,
      safeRiskPerTrade: safeRiskPerTrade,
      lossesAllowedToday: lossesAllowedToday,
      perDayProfitNeeded: perDayProfitNeeded,
    };
  }

  /**
   * リスクリワード比ごとに、損益分岐に必要な勝率を算出する。
   *
   * 損益分岐の必要勝率 = 1 / (1 + RR)。
   *   RR=1 なら 50%、RR=2 なら 33.3%、RR=0.5 なら 66.7%。
   * これは数学的な分岐点であり「勝てる」保証ではない（出力にも明記する）。
   *
   * @param {number[]} ratios RR候補（例 [0.5,1,2,3]）
   * @returns {Array<{rr:number, breakevenWinRatePct:number}>}
   */
  function winRateTable(ratios) {
    var list = Array.isArray(ratios) && ratios.length ? ratios : [1];
    return list
      .map(function (rr) {
        var r = num(rr);
        if (r <= 0) return null;                 // RR<=0は意味を成さないので除外
        var winRate = 1 / (1 + r);               // 損益分岐の必要勝率（0〜1）
        return { rr: r, breakevenWinRatePct: round(winRate * 100, 1) };
      })
      .filter(function (x) {
        return x !== null;
      });
  }

  /**
   * チャレンジ費用回収のROI（期待値）を試算する。
   *
   * これは「ユーザーが入力した前提（合格率・到達利益・分配率）の下での算術的な期待値」であり、
   * 合格や利益を予測・保証するものではない（出力ラベルにも前提依存である旨を必ず明示する）。
   * 売買タイミング・手法には一切踏み込まない（R1ハード条件）。
   *
   * 計算の考え方:
   *   1回の挑戦コスト    = challengeFee（審査料）
   *   合格時の手取り     = fundedProfitAmount × payoutSplitPct/100 （到達利益 × 利益分配率）
   *   1回挑戦の期待手取り = passRatePct/100 × 合格時手取り
   *   1回挑戦の期待損益   = 期待手取り − challengeFee
   *   損益分岐の必要合格率 = challengeFee / 合格時手取り （これを下回ると期待値はマイナス）
   *
   * リトライ前提（任意）: 合格まで平均何回受験するかの期待回数を 1/合格率 で出し、
   *   合格1回を得るための累計審査料の期待値も併記する（リトライで費用が積み上がる現実を可視化）。
   *
   * @param {Object} input
   *   challengeFee        審査料（1回分。通貨はUI側）
   *   passRatePct         想定合格率%（ユーザーの前提。0〜100）
   *   fundedProfitAmount  合格後に到達を想定する利益額（口座での利益。ユーザーの前提）
   *   payoutSplitPct      利益分配率%（トレーダー取り分。例80）
   * @returns {Object} すべて有限値を保証する。
   */
  function computeChallengeRoi(input) {
    var fee = Math.max(0, num(input.challengeFee));
    var passRate = Math.min(100, Math.max(0, num(input.passRatePct))) / 100;   // 0〜1にクランプ
    var profit = Math.max(0, num(input.fundedProfitAmount));
    var split = Math.min(100, Math.max(0, num(input.payoutSplitPct))) / 100;   // 0〜1にクランプ

    // 合格1回で得られる手取り（到達利益 × 分配率）。
    var payoutOnPass = profit * split;

    // 1回挑戦あたりの期待手取りと期待損益。
    var expectedPayoutPerAttempt = passRate * payoutOnPass;
    var expectedNetPerAttempt = expectedPayoutPerAttempt - fee;

    // 損益分岐に必要な合格率: fee / payoutOnPass（手取り0なら分岐不能=Infinity回避し1=100%超扱い）。
    var breakevenPassRatePct = payoutOnPass > 0 ? round((fee / payoutOnPass) * 100, 1) : 100;

    // 合格1回に必要な期待受験回数（リトライ前提）。合格率0なら不能なので0を返す。
    var expectedAttemptsToPass = passRate > 0 ? round(1 / passRate, 2) : 0;
    // 合格1回を得るための累計審査料の期待値（リトライで費用が積み上がる現実）。
    var expectedFeeUntilPass = passRate > 0 ? fee / passRate : 0;
    // 合格1回ベースの正味期待損益（手取り − 累計審査料）。
    var expectedNetUntilPass = payoutOnPass - expectedFeeUntilPass;

    return {
      challengeFee: fee,
      payoutOnPass: payoutOnPass,
      expectedPayoutPerAttempt: expectedPayoutPerAttempt,
      expectedNetPerAttempt: expectedNetPerAttempt,
      // 期待値がプラスか（前提が正しい場合に限る算術的判定。勝てる保証ではない）。
      positiveExpectation: expectedNetPerAttempt > 0,
      breakevenPassRatePct: breakevenPassRatePct,
      expectedAttemptsToPass: expectedAttemptsToPass,
      expectedFeeUntilPass: expectedFeeUntilPass,
      expectedNetUntilPass: expectedNetUntilPass,
    };
  }

  /**
   * tracker用: 日次損益ログから現在の進捗とDD余地を算出する。
   *
   * @param {number[]} dailyPnls 日次損益の配列（古い順。利益+/損失-）
   * @param {Object} basics computeBasics の戻り値
   * @param {number} todayPnl 当日のここまでの損益（日次DD判定用、省略時0）
   * @returns {Object}
   */
  function computeProgress(dailyPnls, basics, todayPnl) {
    var pnls = Array.isArray(dailyPnls) ? dailyPnls : [];
    todayPnl = num(todayPnl, 0);

    // 累計損益。
    var cumulative = pnls.reduce(function (acc, v) {
      return acc + num(v);
    }, 0);

    // 利益目標までの残り（達成済みなら0でクランプ）。
    var remainingToTarget = Math.max(0, basics.profitTargetAmount - cumulative);

    // 最大DDに対する余地: 累計がマイナスのとき、その分だけ最大損失上限を消費している。
    // 累計がプラスなら最大DD余地はフル（保守的に初期残高基準で見る）。
    var drawdownUsed = cumulative < 0 ? Math.abs(cumulative) : 0;
    var maxDdRemaining = Math.max(0, basics.maxLossLimit - drawdownUsed);

    // 当日の日次DDに対する余地: 当日損失が日次上限をどれだけ消費したか。
    var dailyLossUsed = todayPnl < 0 ? Math.abs(todayPnl) : 0;
    var dailyDdRemaining = Math.max(0, basics.dailyLossLimit - dailyLossUsed);

    // あと何回負けられるか（当日・残りの日次余地ベース）。
    var lossesLeftToday =
      basics.riskPerTradeAmount > 0
        ? Math.floor(dailyDdRemaining / basics.riskPerTradeAmount)
        : 0;

    return {
      cumulative: cumulative,
      remainingToTarget: remainingToTarget,
      targetReached: cumulative >= basics.profitTargetAmount && basics.profitTargetAmount > 0,
      maxDdRemaining: maxDdRemaining,
      maxDdUsedPctOfLimit:
        basics.maxLossLimit > 0 ? round((drawdownUsed / basics.maxLossLimit) * 100, 1) : 0,
      dailyDdRemaining: dailyDdRemaining,
      dailyDdUsedPctOfLimit:
        basics.dailyLossLimit > 0 ? round((dailyLossUsed / basics.dailyLossLimit) * 100, 1) : 0,
      lossesLeftToday: lossesLeftToday,
    };
  }

  /**
   * ルール抵触の事前警告を生成する（助言ではなく、ルール残余地の機械的な通知）。
   * 閾値接近・超過を文字列の配列で返す。UIはこれを淡々と列挙するだけ。
   *
   * @param {Object} progress computeProgress の戻り値
   * @param {Object} basics computeBasics の戻り値
   * @returns {Array<{level:string, message:string}>} level: "danger" | "warn" | "info"
   */
  function buildWarnings(progress, basics) {
    var out = [];

    // 最大DD: 80%超で警告、100%以上で抵触。
    if (basics.maxLossLimit > 0) {
      if (progress.maxDdUsedPctOfLimit >= 100) {
        out.push({ level: "danger", message: "最大ドローダウン上限に到達しています（ルール抵触の水準）。" });
      } else if (progress.maxDdUsedPctOfLimit >= 80) {
        out.push({
          level: "warn",
          message: "最大ドローダウン上限の残りが2割を切りました（使用 " + progress.maxDdUsedPctOfLimit + "%）。",
        });
      }
    }

    // 日次DD: 80%超で警告、100%以上で抵触。
    if (basics.dailyLossLimit > 0) {
      if (progress.dailyDdUsedPctOfLimit >= 100) {
        out.push({ level: "danger", message: "本日の日次ドローダウン上限に到達しています（ルール抵触の水準）。" });
      } else if (progress.dailyDdUsedPctOfLimit >= 80) {
        out.push({
          level: "warn",
          message: "本日の日次ドローダウン上限の残りが2割を切りました（使用 " + progress.dailyDdUsedPctOfLimit + "%）。",
        });
      }
    }

    // あと何回負けられるか。
    if (progress.lossesLeftToday <= 0 && basics.riskPerTradeAmount > 0) {
      out.push({ level: "danger", message: "本日の日次余地では、設定リスクでこれ以上の負けを許容できません。" });
    } else if (progress.lossesLeftToday === 1) {
      out.push({ level: "warn", message: "本日あと負けられる回数は1回です（設定リスク基準）。" });
    }

    if (out.length === 0) {
      out.push({ level: "info", message: "現時点でルール上限への接近は検出されていません（あくまで入力値に基づく目安）。" });
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // エクスポート（ブラウザ / Node 両対応）
  // ---------------------------------------------------------------------------

  var api = {
    num: num,
    round: round,
    computeBasics: computeBasics,
    winRateTable: winRateTable,
    computeChallengeRoi: computeChallengeRoi,
    computeProgress: computeProgress,
    buildWarnings: buildWarnings,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;        // Node（テスト用）
  } else {
    root.PropCalc = api;         // ブラウザ（window.PropCalc）
  }
})(typeof window !== "undefined" ? window : this);

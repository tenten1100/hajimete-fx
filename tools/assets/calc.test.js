/*
 * calc.test.js — calc.js（純関数）の検証
 * 実行: node --test prop-tools/assets/calc.test.js
 * DOM非依存部分のみを対象（chart/ui/storageはブラウザ依存のため対象外）。
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const calc = require("./calc.js");

test("computeBasics: 基本の金額換算が手計算と一致する", () => {
  const b = calc.computeBasics(
    {
      accountSize: 1000000,
      profitTargetPct: 10,
      dailyDdPct: 5,
      maxDdPct: 10,
      daysLeft: 10,
      riskPerTradePct: 1,
    },
    { safetyFactor: 0.5 }
  );
  assert.equal(b.profitTargetAmount, 100000); // 10% of 1,000,000
  assert.equal(b.dailyLossLimit, 50000); // 5%
  assert.equal(b.maxLossLimit, 100000); // 10%
  assert.equal(b.riskPerTradeAmount, 10000); // 1%
  // safeRiskPerTrade = min(10000, 50000*0.5=25000) = 10000
  assert.equal(b.safeRiskPerTrade, 10000);
  // あと何回負けられるか = floor(50000 / 10000) = 5
  assert.equal(b.lossesAllowedToday, 5);
  // 1日あたり必要利益 = 100000 / 10 = 10000
  assert.equal(b.perDayProfitNeeded, 10000);
});

test("computeBasics: safetyFactorで1トレードリスクが頭打ちになる", () => {
  // riskPerTrade(3%)=30000 が dailyLimit(5%)*0.5=25000 を上回るので25000に頭打ち。
  const b = calc.computeBasics(
    { accountSize: 1000000, profitTargetPct: 10, dailyDdPct: 5, maxDdPct: 10, daysLeft: 10, riskPerTradePct: 3 },
    { safetyFactor: 0.5 }
  );
  assert.equal(b.safeRiskPerTrade, 25000);
});

test("computeBasics: 境界（残日数0・口座0・リスク0）でNaN/Infinityを返さない", () => {
  const b = calc.computeBasics(
    { accountSize: 0, profitTargetPct: 0, dailyDdPct: 0, maxDdPct: 0, daysLeft: 0, riskPerTradePct: 0 },
    {}
  );
  Object.keys(b).forEach((k) => {
    assert.ok(isFinite(b[k]), `${k} は有限値であるべき: ${b[k]}`);
  });
  // riskが0なら「あと何回負けられるか」は0扱い。
  assert.equal(b.lossesAllowedToday, 0);
  // 残日数0でも0除算しない（max(1,0)で割る）。
  assert.equal(b.perDayProfitNeeded, 0);
});

test("computeBasics: 不正入力（文字列/NaN）でも破綻しない", () => {
  const b = calc.computeBasics(
    { accountSize: "abc", profitTargetPct: NaN, dailyDdPct: undefined, maxDdPct: null, daysLeft: -5, riskPerTradePct: "x" },
    {}
  );
  Object.keys(b).forEach((k) => assert.ok(isFinite(b[k])));
});

test("winRateTable: 損益分岐の必要勝率 = 1/(1+RR)", () => {
  const rows = calc.winRateTable([0.5, 1, 2, 3]);
  const byRr = {};
  rows.forEach((r) => (byRr[r.rr] = r.breakevenWinRatePct));
  assert.equal(byRr[1], 50); // 1/(1+1)=50%
  assert.equal(byRr[2], 33.3); // 1/3=33.3%
  assert.equal(byRr[3], 25); // 1/4=25%
  assert.equal(byRr[0.5], 66.7); // 1/1.5=66.7%
});

test("winRateTable: RR<=0や空配列を安全に扱う", () => {
  assert.deepEqual(calc.winRateTable([0, -1]), []); // 無効値は除外
  const fallback = calc.winRateTable([]); // 空→[1]扱い→50%
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].breakevenWinRatePct, 50);
});

test("computeChallengeRoi: 期待値・損益分岐合格率が手計算と一致する", () => {
  // 審査料50000・想定合格率10%・到達利益500000・分配率80%。
  const r = calc.computeChallengeRoi({
    challengeFee: 50000,
    passRatePct: 10,
    fundedProfitAmount: 500000,
    payoutSplitPct: 80,
  });
  // 合格時手取り = 500000 * 0.8 = 400000
  assert.equal(r.payoutOnPass, 400000);
  // 1回挑戦の期待手取り = 0.10 * 400000 = 40000
  assert.equal(r.expectedPayoutPerAttempt, 40000);
  // 期待損益 = 40000 - 50000 = -10000（マイナス）
  assert.equal(r.expectedNetPerAttempt, -10000);
  assert.equal(r.positiveExpectation, false);
  // 損益分岐の必要合格率 = 50000/400000 = 12.5%
  assert.equal(r.breakevenPassRatePct, 12.5);
  // 合格1回に必要な期待受験回数 = 1/0.10 = 10回
  assert.equal(r.expectedAttemptsToPass, 10);
  // 合格1回までの累計審査料の期待値 = 50000/0.10 = 500000
  assert.equal(r.expectedFeeUntilPass, 500000);
  // 合格1回ベースの正味期待損益 = 400000 - 500000 = -100000
  assert.equal(r.expectedNetUntilPass, -100000);
});

test("computeChallengeRoi: 合格率が損益分岐を上回ると期待値プラス", () => {
  // 上と同条件で合格率を15%にすると分岐(12.5%)を超え期待値はプラスになる。
  const r = calc.computeChallengeRoi({
    challengeFee: 50000,
    passRatePct: 15,
    fundedProfitAmount: 500000,
    payoutSplitPct: 80,
  });
  // 期待手取り = 0.15 * 400000 = 60000、期待損益 = 60000 - 50000 = 10000
  assert.equal(r.expectedNetPerAttempt, 10000);
  assert.equal(r.positiveExpectation, true);
});

test("computeChallengeRoi: 境界（手取り0・合格率0）でNaN/Infinityを返さない", () => {
  const r = calc.computeChallengeRoi({
    challengeFee: 0,
    passRatePct: 0,
    fundedProfitAmount: 0,
    payoutSplitPct: 0,
  });
  Object.keys(r).forEach((k) => {
    if (typeof r[k] === "number") assert.ok(isFinite(r[k]), `${k} は有限値であるべき: ${r[k]}`);
  });
  // 手取り0なら分岐は100%扱い、合格率0なら期待受験回数・累計費用は0扱い。
  assert.equal(r.breakevenPassRatePct, 100);
  assert.equal(r.expectedAttemptsToPass, 0);
  assert.equal(r.expectedFeeUntilPass, 0);
});

test("computeChallengeRoi: 合格率は0〜100にクランプされる", () => {
  // 150%を渡しても100%扱い、-5%を渡しても0%扱いになる。
  const over = calc.computeChallengeRoi({ challengeFee: 10000, passRatePct: 150, fundedProfitAmount: 100000, payoutSplitPct: 100 });
  // 合格率100%・手取り100000 → 期待損益 = 100000 - 10000 = 90000
  assert.equal(over.expectedNetPerAttempt, 90000);
  const under = calc.computeChallengeRoi({ challengeFee: 10000, passRatePct: -5, fundedProfitAmount: 100000, payoutSplitPct: 100 });
  // 合格率0%扱い → 期待手取り0 → 期待損益 = -10000
  assert.equal(under.expectedPayoutPerAttempt, 0);
  assert.equal(under.expectedNetPerAttempt, -10000);
});

test("computeChallengeRoi: 不正入力（文字列/NaN）でも破綻しない", () => {
  const r = calc.computeChallengeRoi({
    challengeFee: "abc",
    passRatePct: NaN,
    fundedProfitAmount: undefined,
    payoutSplitPct: null,
  });
  Object.keys(r).forEach((k) => {
    if (typeof r[k] === "number") assert.ok(isFinite(r[k]));
  });
});

test("computeProgress: 累計・残り・DD余地が正しい", () => {
  const b = calc.computeBasics(
    { accountSize: 1000000, profitTargetPct: 10, dailyDdPct: 5, maxDdPct: 10, daysLeft: 10, riskPerTradePct: 1 },
    {}
  );
  // 日次: +30000, -20000 → 累計+10000、当日損益=-20000
  const p = calc.computeProgress([30000, -20000], b, -20000);
  assert.equal(p.cumulative, 10000);
  assert.equal(p.remainingToTarget, 90000); // 100000 - 10000
  assert.equal(p.targetReached, false);
  // 累計プラスなので最大DD未消費 → 残り余地はフル(100000)
  assert.equal(p.maxDdRemaining, 100000);
  // 当日-20000 / 日次上限50000 = 40%使用、残り30000
  assert.equal(p.dailyDdRemaining, 30000);
  assert.equal(p.dailyDdUsedPctOfLimit, 40);
  // あと負け = floor(30000 / 10000) = 3
  assert.equal(p.lossesLeftToday, 3);
});

test("computeProgress: 累計マイナスは最大DDを消費する", () => {
  const b = calc.computeBasics(
    { accountSize: 1000000, profitTargetPct: 10, dailyDdPct: 5, maxDdPct: 10, daysLeft: 10, riskPerTradePct: 1 },
    {}
  );
  const p = calc.computeProgress([-90000], b, -90000);
  // 最大DD上限100000のうち90000消費 → 残り10000、使用90%
  assert.equal(p.maxDdRemaining, 10000);
  assert.equal(p.maxDdUsedPctOfLimit, 90);
});

test("computeProgress: 空ログでも破綻しない", () => {
  const b = calc.computeBasics(
    { accountSize: 1000000, profitTargetPct: 10, dailyDdPct: 5, maxDdPct: 10, daysLeft: 10, riskPerTradePct: 1 },
    {}
  );
  const p = calc.computeProgress([], b, 0);
  assert.equal(p.cumulative, 0);
  assert.equal(p.remainingToTarget, 100000);
  assert.equal(p.lossesLeftToday, 5); // フル余地: 50000/10000
});

test("buildWarnings: 最大DD80%超でwarn、100%でdanger", () => {
  const b = calc.computeBasics(
    { accountSize: 1000000, profitTargetPct: 10, dailyDdPct: 5, maxDdPct: 10, daysLeft: 10, riskPerTradePct: 1 },
    {}
  );
  const warn = calc.buildWarnings(calc.computeProgress([-85000], b, 0), b);
  assert.ok(warn.some((w) => w.level === "warn"));
  const danger = calc.buildWarnings(calc.computeProgress([-100000], b, 0), b);
  assert.ok(danger.some((w) => w.level === "danger"));
});

test("buildWarnings: 抵触なしならinfoを1件返す", () => {
  const b = calc.computeBasics(
    { accountSize: 1000000, profitTargetPct: 10, dailyDdPct: 5, maxDdPct: 10, daysLeft: 10, riskPerTradePct: 1 },
    {}
  );
  const w = calc.buildWarnings(calc.computeProgress([10000], b, 0), b);
  assert.ok(w.some((x) => x.level === "info"));
});

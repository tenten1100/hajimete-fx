/*
 * tool-config.js — 計算ツールのベンチマーク初期値（差し替え可能）
 *
 * prop-tools/config.js の benchmarks 部分を、プロップナビのツール用に分離したもの。
 * アフィリ/noteリンクはサイト共通の assets/links.js（window.PROPNAVI）が管理するため、
 * ここには計算の前提値のみを置く（責務を分ける）。
 *
 * 方針（CLAUDE.md / funnel_engine.py と整合）:
 *   - ベンチマーク値はハードコードせず、このファイルで差し替え可能に保つ。
 *   - 数値はあくまで一般的な目安のシード値。各プロップの実際のルールで上書きする前提。
 */

window.PROP_TOOL_BENCHMARKS = {
  profitTargetPct: 10,     // 利益目標%（口座サイズに対する）の初期値
  dailyDrawdownPct: 5,     // 日次ドローダウン上限%の初期値
  maxDrawdownPct: 10,      // 最大ドローダウン上限%の初期値
  riskPerTradePct: 1,      // 1トレード許容リスク%の初期値
  daysLeft: 30,            // 残り日数の初期値

  // 安全ロット目安の保守係数（0〜1）。日次余地のうち何割までを1トレードに割り当てるか。
  safetyFactor: 0.5,

  // 必要勝率×リスクリワード表で提示するRR候補。
  riskRewardRatios: [0.5, 1, 1.5, 2, 3],

  // ROIシミュレータの初期値（前提値のシード。各社の実数で上書きする前提）。
  // これらは「合格・利益を予測する値」ではなく、ユーザーが置く前提のたたき台にすぎない。
  roi: {
    challengeFee: 50000,        // 審査料（1回分）の初期値
    passRatePct: 10.6,          // 想定合格率%の初期値（小売プロップ全体の集計値。各自の前提で上書き）
    fundedProfitAmount: 500000, // 合格後に到達を想定する利益額の初期値
    payoutSplitPct: 80,         // 利益分配率%（トレーダー取り分）の初期値
  },
};

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
};

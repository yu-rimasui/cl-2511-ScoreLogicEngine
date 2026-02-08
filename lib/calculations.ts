import { ScoreData, HoleData } from "@/types/score";

/**
 * 分析用統計データの型定義
 * AI分析アルゴリズム.csv の出力項目(D1-D155)に対応する数値を保持
 */
export interface AnalysisStats {
  // ■ 基本集計
  total_score: number;
  total_par: number;
  total_relative_score: number; // +15 等
  total_putts: number;
  
  // ■ ハーフ別分析 (流れ)
  first_half: {
    score: number;
    par: number;
    putts: number;
    relative: number;
  };
  second_half: {
    score: number;
    par: number;
    putts: number;
    relative: number;
    diff_from_first: number; // 後半 - 前半
  };

  // ■ Par別分析 (D26-D28: 得意不得意)
  par3: ParStats;
  par4: ParStats;
  par5: ParStats;

  // ■ 3ホール区間分析 (D82-D99: リズム・集中力推移)
  // Zone1(1-3), Zone2(4-6), Zone3(7-9), Zone4(10-12), Zone5(13-15), Zone6(16-18)
  zones: ZoneStats[];

  // ■ スコア分布 (D5-D10: 安定性)
  distribution: {
    eagle_or_better: number;
    birdie: number;
    par: number;
    bogey: number;
    double_bogey: number;
    triple_bogey_or_worse: number;
    par_keep_rate: number; // パー率 (%)
    bogey_rate: number;    // ボギー率 (%)
  };

  // ■ スタッツ (入力がある場合のみ有効)
  stats_accuracy: {
    fairway_keep_rate: number | null; // D11-D13
    par_on_rate: number | null;       // D29-D30 (GIR)
    bogey_on_rate: number | null;
  };
}

interface ParStats {
  count: number;
  avg_score: number;      // 平均スコア (例: 5.2)
  avg_relative: number;   // 平均パー差 (例: +1.2)
  avg_putts: number;
}

interface ZoneStats {
  id: number;            // 1~6
  label: string;         // "H1-3", "H10-12" etc
  total_score: number;
  relative_score: number;
  trend: string;         // 分析用テキスト ("耐えた", "崩れた" 等の簡易判定用)
}

/**
 * スコアデータから詳細な統計情報を計算する関数
 * これをAIへのプロンプトに含めることで、計算ミスを100%防ぐ
 */
export const calculateStats = (data: ScoreData): AnalysisStats => {
  const holes = data.holes || [];
  
  // play_order順にソート（念のため）
  const sortedHoles = [...holes].sort((a, b) => a.play_order - b.play_order);

  // --- 基本集計 ---
  const total_score = data.total_score;
  const total_par = data.total_par;
  const total_relative = total_score - total_par;
  const total_putts = sortedHoles.reduce((sum, h) => sum + (h.putts || 0), 0);

  // --- ハーフ別集計 ---
  // display_numberではなく、play_orderで前半(1-9)・後半(10-18)を分ける
  const firstHalfHoles = sortedHoles.filter(h => h.play_order <= 9);
  const secondHalfHoles = sortedHoles.filter(h => h.play_order >= 10);

  const calcHalf = (hs: HoleData[]) => {
    const s = hs.reduce((sum, h) => sum + h.score, 0);
    const p = hs.reduce((sum, h) => sum + h.par, 0);
    const pt = hs.reduce((sum, h) => sum + (h.putts || 0), 0);
    return { score: s, par: p, putts: pt, relative: s - p };
  };

  const firstHalf = calcHalf(firstHalfHoles);
  const secondHalf = calcHalf(secondHalfHoles);

  // --- Par別集計 ---
  const calcParStats = (targetPar: number): ParStats => {
    const targetHoles = sortedHoles.filter(h => h.par === targetPar);
    const count = targetHoles.length;
    if (count === 0) return { count: 0, avg_score: 0, avg_relative: 0, avg_putts: 0 };

    const sumScore = targetHoles.reduce((sum, h) => sum + h.score, 0);
    const sumPar = targetHoles.reduce((sum, h) => sum + h.par, 0);
    const sumPutts = targetHoles.reduce((sum, h) => sum + (h.putts || 0), 0);

    return {
      count,
      avg_score: parseFloat((sumScore / count).toFixed(2)),
      avg_relative: parseFloat(((sumScore - sumPar) / count).toFixed(2)),
      avg_putts: parseFloat((sumPutts / count).toFixed(2)),
    };
  };

  // --- 区間分析 (3ホールごと) ---
  const zones: ZoneStats[] = [];
  for (let i = 0; i < 6; i++) {
    const start = i * 3; // 0, 3, 6...
    const zoneHoles = sortedHoles.slice(start, start + 3);
    const zoneScore = zoneHoles.reduce((sum, h) => sum + h.score, 0);
    const zonePar = zoneHoles.reduce((sum, h) => sum + h.par, 0);
    const zoneRelative = zoneScore - zonePar;
    
    // play_order表記
    const label = `H${start + 1}-${start + 3}`;

    zones.push({
      id: i + 1,
      label,
      total_score: zoneScore,
      relative_score: zoneRelative,
      trend: zoneRelative <= 1 ? "好調" : zoneRelative <= 3 ? "標準" : "不調"
    });
  }

  // --- スコア分布 ---
  const distribution = {
    eagle_or_better: 0,
    birdie: 0,
    par: 0,
    bogey: 0,
    double_bogey: 0,
    triple_bogey_or_worse: 0,
    par_keep_rate: 0,
    bogey_rate: 0
  };

  sortedHoles.forEach(h => {
    const rel = h.score - h.par;
    if (rel <= -2) distribution.eagle_or_better++;
    else if (rel === -1) distribution.birdie++;
    else if (rel === 0) distribution.par++;
    else if (rel === 1) distribution.bogey++;
    else if (rel === 2) distribution.double_bogey++;
    else distribution.triple_bogey_or_worse++;
  });

  distribution.par_keep_rate = parseFloat(((distribution.par + distribution.birdie + distribution.eagle_or_better) / 18 * 100).toFixed(1));
  distribution.bogey_rate = parseFloat(((distribution.bogey) / 18 * 100).toFixed(1));

  // --- スタッツ計算 (データがある場合のみ) ---
  // FWキープ対象: Par4 または Par5
  const fwTargets = sortedHoles.filter(h => h.par >= 4 && h.is_fairway_keep !== null && h.is_fairway_keep !== undefined);
  const fwKeepRate = fwTargets.length > 0
    ? parseFloat((fwTargets.filter(h => h.is_fairway_keep).length / fwTargets.length * 100).toFixed(1))
    : null;

  // パーオン対象: 全ホール
  const girTargets = sortedHoles.filter(h => h.is_par_on !== null && h.is_par_on !== undefined);
  const girRate = girTargets.length > 0
    ? parseFloat((girTargets.filter(h => h.is_par_on).length / girTargets.length * 100).toFixed(1))
    : null;

  return {
    total_score,
    total_par,
    total_relative_score: total_relative,
    total_putts,
    first_half: firstHalf,
    second_half: {
      ...secondHalf,
      diff_from_first: secondHalf.score - firstHalf.score
    },
    par3: calcParStats(3),
    par4: calcParStats(4),
    par5: calcParStats(5),
    zones,
    distribution,
    stats_accuracy: {
      fairway_keep_rate: fwKeepRate,
      par_on_rate: girRate,
      bogey_on_rate: null // 必要に応じて計算ロジック追加
    }
  };
};

/**
 * AIプロンプト用のテキスト形式に変換する関数
 * JSONではなく、AIが読みやすい自然言語混じりのテキストを出力する
 */
export const formatStatsForPrompt = (stats: AnalysisStats): string => {
  return `
【正確な集計データ（計算済み）】
※以下の数値はプログラムで計算された正確な値です。分析時にはこの数値を正として扱ってください。

1. 総合スコア
   - Total: ${stats.total_score} (Par ${stats.total_par}, ${stats.total_relative_score > 0 ? "+" : ""}${stats.total_relative_score})
   - Putts: ${stats.total_putts}
   - 前半(H1-9): ${stats.first_half.score} (${stats.first_half.relative > 0 ? "+" : ""}${stats.first_half.relative})
   - 後半(H10-18): ${stats.second_half.score} (${stats.second_half.relative > 0 ? "+" : ""}${stats.second_half.relative})
   - 後半の崩れ: ${stats.second_half.diff_from_first > 0 ? "+" + stats.second_half.diff_from_first + "打悪化" : Math.abs(stats.second_half.diff_from_first) + "打改善"}

2. Par別パフォーマンス（得意・不得意の傾向）
   - Par3平均: ${stats.par3.avg_score} (${stats.par3.avg_relative > 0 ? "+" : ""}${stats.par3.avg_relative}) / AvgPutts: ${stats.par3.avg_putts}
   - Par4平均: ${stats.par4.avg_score} (${stats.par4.avg_relative > 0 ? "+" : ""}${stats.par4.avg_relative}) / AvgPutts: ${stats.par4.avg_putts}
   - Par5平均: ${stats.par5.avg_score} (${stats.par5.avg_relative > 0 ? "+" : ""}${stats.par5.avg_relative}) / AvgPutts: ${stats.par5.avg_putts}

3. 3ホール毎のリズム変化（区間分析）
   - H1-3: ${stats.zones[0].relative_score > 0 ? "+" : ""}${stats.zones[0].relative_score}
   - H4-6: ${stats.zones[1].relative_score > 0 ? "+" : ""}${stats.zones[1].relative_score}
   - H7-9: ${stats.zones[2].relative_score > 0 ? "+" : ""}${stats.zones[2].relative_score}
   - H10-12: ${stats.zones[3].relative_score > 0 ? "+" : ""}${stats.zones[3].relative_score}
   - H13-15: ${stats.zones[4].relative_score > 0 ? "+" : ""}${stats.zones[4].relative_score}
   - H16-18: ${stats.zones[5].relative_score > 0 ? "+" : ""}${stats.zones[5].relative_score}

4. スコア内容
   - Par率: ${stats.distribution.par_keep_rate}% (Par ${stats.distribution.par}個, Birdie ${stats.distribution.birdie}個)
   - ボギー率: ${stats.distribution.bogey_rate}%
   - 大叩き(ダブルボギー以上): ${stats.distribution.double_bogey + stats.distribution.triple_bogey_or_worse}回

5. ショット精度 (データがある場合のみ)
   - FWキープ率: ${stats.stats_accuracy.fairway_keep_rate !== null ? stats.stats_accuracy.fairway_keep_rate + "%" : "データなし"}
   - パーオン率: ${stats.stats_accuracy.par_on_rate !== null ? stats.stats_accuracy.par_on_rate + "%" : "データなし"}
`;
};
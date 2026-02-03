// types/score.ts

/**
 * スコアカード全体のデータ構造
 * 物理的な「1枚のカード（1ラウンド）」を表します。
 */
export interface ScoreData {
  id?: string;             // FirestoreのドキュメントID
  course_name: string;
  date: string;            // YYYY-MM-DD
  
  // ▼ 集計データ（分析のサマリ用）
  total_score: number;
  total_putts: number;
  total_par: number;       // パー72じゃないコースもあるため重要
  
  // ▼ メタデータ
  weather?: string;        // 天気（OCRで取れる場合がある、分析の言い訳材料になる）
  memo?: string;           // ユーザーメモ

  // ▼ 構造化データ（表示用）
  // 常に「回った順」で 前半(1-9H) / 後半(10-18H) を管理
  half_scores: {
    first_half: HalfData;
    second_half: HalfData;
  };

  // ▼ フラットデータ（分析・グラフ描画用）
  // play_order 順にソートされた18個の配列
  holes: HoleData[];
}

/**
 * ハーフ（9ホール）ごとの集計データ
 */
export interface HalfData {
  section_name: string;    // "OUT", "IN", "西", "東" など
  total_score: number;
  total_par: number;       // そのハーフのパー合計（36とは限らない）
  total_putts: number;
  relative_score: number;  // パーに対するプラスマイナス (+5など)
}

/**
 * 1ホールごとの詳細データ
 */
export interface HoleData {
  // ▼ 順序・識別情報
  play_order: number;      // 1〜18（時系列順。これが分析の主軸）
  display_number: number;  // 1〜9, 10〜18（カード上の表記番号）
  
  // ▼ 基本スコア情報
  par: number;
  score: number;
  putts: number;
  
  // ▼ 分析用詳細情報（AI分析アルゴリズム.csv S3, S4 対応）
  yardage?: number;        // 距離（OCRで取れれば。難易度分析に必須）
  handicap?: number;       // ホールHC（OCRで取れれば。勝負所分析に必須）
  
  // ▼ 派生データ（計算済みにしておくと楽）
  relative_score: number;  // ストローク差（例: +1, -1, 0）
  
  // ▼ スタッツ（OCR精度に依存するが、あるとリッチになる）
  // 明確にマルがついている場合のみ true, 判定不能は null 推奨
  is_fairway_keep?: boolean | null; // FWキープ (S9)
  is_par_on?: boolean | null;       // パーオン (S8)
}
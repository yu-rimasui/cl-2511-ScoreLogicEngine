import { useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// スコアデータの型定義 (useRegisterScoreと同じものを使用)
// 実際は types.ts などで共有するのがベストですが、ここでは簡易的に定義
interface ScoreData {
  total_score?: number;
  date?: string;
  course_name?: string;
  holes?: Array<{
    number: number;
    score: number;
    putts?: number;
  }>;
}

export const useAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // [B] 過去データ参照機能 (実装済み)
  const fetchPastSummaries = async (): Promise<string> => {
    if (!auth.currentUser) return "";
    try {
      const uid = auth.currentUser.uid;
      const scoresRef = collection(db, "users", uid, "scores");
      const q = query(scoresRef, orderBy("createdAt", "desc"), limit(10));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return "";

      const pastContexts = snapshot.docs
        .map(doc => {
          const data = doc.data();
          if (!data.analysis_result) return null; 
          return `
          --------------------------------------------------
          【過去ラウンドの日付: ${data.date || "不明"}】
          【コース名: ${data.course_name || "不明"}】
          【スコア: ${data.total_score}】
          ▼ 過去の分析レポート
          ${data.analysis_result}
          `; 
        })
        .filter(item => item !== null)
        .slice(0, 5);

      if (pastContexts.length === 0) return "";

      return `
      【重要：ユーザーの過去データ】
      以下は、このユーザーの過去の分析レポート履歴です。
      これまでの傾向（成長した点、変わらない課題）を読み取り、
      今回のレポートでは「以前と比べてどうだったか」という視点も適宜盛り込んでください。
      ${pastContexts.join("\n")}
      --------------------------------------------------
      `;
    } catch (error) {
      console.error("Error fetching past summaries:", error);
      return ""; 
    }
  };

  // [C] 分析実行処理
  const executeAnalysis = async (scoreData: ScoreData, scoreId: string) => {
    if (!auth.currentUser) {
      alert("ログインが必要です");
      return null;
    }

    setIsAnalyzing(true);
    try {
      // 1. 過去データの取得
      const pastSummaries = await fetchPastSummaries();

      // 2. APIへ送信
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreData,
          pastSummaries,
          userId: auth.currentUser.uid,
          scoreId: scoreId
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis API failed");
      }

      const data = await response.json();
      return data.result; // Markdownテキスト

    } catch (error) {
      console.error("Analysis execution error:", error);
      alert("AI分析中にエラーが発生しました。");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    setIsAnalyzing,
    fetchPastSummaries,
    executeAnalysis,
  };
};
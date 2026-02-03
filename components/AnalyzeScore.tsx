"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAnalysis } from "@/hooks/useAnalysis";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScoreData } from "@/types/score";

interface AnalyzeScoreProps {
  scoreId: string;
}

export default function AnalyzeScore({ scoreId }: AnalyzeScoreProps) {
  const router = useRouter();
  const { isAnalyzing, executeAnalysis } = useAnalysis();
  
  const [loadingData, setLoadingData] = useState(true);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [resultMarkdown, setResultMarkdown] = useState<string | null>(null);

  // 1. 初回ロード時: Firestoreからデータを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, "users", auth.currentUser.uid, "scores", scoreId);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setScoreData(data as ScoreData);
          // 既に分析済みなら結果をセット
          if (data.analysis_result) {
            setResultMarkdown(data.analysis_result);
          }
        } else {
          alert("データが見つかりません");
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching score:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [scoreId, router]);

  // 2. 分析実行ハンドラ
  const handleAnalyze = async () => {
    if (!scoreData) return;
    
    // フック経由でAPIを叩く
    const result = await executeAnalysis(scoreData, scoreId);
    
    if (result) {
      setResultMarkdown(result);
    }
  };

  // ローディング表示
  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans pb-20">
      
      {/* ヘッダー */}
      <div className="bg-emerald-900 text-white px-6 py-6 text-center shadow-md">
        <h1 className="font-serif text-xl tracking-widest">ANALYSIS REPORT</h1>
        <div className="h-0.5 w-12 bg-emerald-600 mx-auto mt-2 opacity-80"></div>
        <p className="text-xs text-emerald-100 mt-2 font-medium tracking-wider uppercase">
          {scoreData?.date} / {scoreData?.course_name || "Unknown Course"}
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* A. まだ分析結果がない場合: 実行ボタンを表示 */}
        {!resultMarkdown && (
          <div className="flex flex-col items-center justify-center space-y-6 py-12 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-serif text-emerald-950">Ready to Analyze</h2>
              <p className="text-sm text-stone-500">
                スコアデータの登録が完了しました。<br/>
                AIがあなたのプレーを詳細に分析します。
              </p>
            </div>

            <div className="w-full max-w-sm bg-white p-6 rounded-sm shadow-sm border border-stone-200">
                <div className="flex justify-between items-center text-sm mb-4 border-b border-stone-100 pb-2">
                  <span className="text-stone-400 font-bold">TOTAL SCORE</span>
                  <span className="text-2xl font-serif font-bold text-emerald-900">{scoreData?.total_score}</span>
                </div>
                
                <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`w-full py-4 rounded-sm font-semibold tracking-widest shadow-md transition-all duration-300 text-sm ${
                  isAnalyzing
                    ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                    : "bg-emerald-900 text-white hover:bg-emerald-800 hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full"></span>
                    ANALYZING...
                  </span>
                ) : (
                  "✨ AI分析を実行する"
                )}
              </button>
            </div>
          </div>
        )}

        {/* B. 分析結果がある場合: レポートを表示 */}
        {resultMarkdown && (
          <div className="space-y-8 animate-fade-in">
            {/* Markdown表示エリア */}
            <article className="prose prose-stone prose-emerald max-w-none bg-white p-8 rounded-sm shadow-sm border border-stone-100">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // 見出しのデザインカスタマイズ
                  h1: (props) => <h1 className="text-2xl font-serif text-emerald-950 border-b-2 border-emerald-900/10 pb-2 mb-6 mt-0" {...props} />,
                  h2: (props) => <h2 className="text-lg font-bold text-emerald-900 mt-8 mb-4 flex items-center gap-2" {...props} />,
                  h3: (props) => <h3 className="text-base font-bold text-stone-800 mt-6 mb-2 border-l-4 border-emerald-600 pl-3" {...props} />,
                  p: (props) => <p className="text-sm leading-relaxed text-stone-600 mb-4" {...props} />,
                  strong: (props) => <strong className="font-bold text-emerald-800" {...props} />,
                  ul: (props) => <ul className="list-disc list-outside ml-4 text-sm text-stone-600 space-y-1 mb-4" {...props} />,
                  li: (props) => <li className="pl-1" {...props} />,
                  hr: (props) => <hr className="my-8 border-stone-200" {...props} />,
                }}
              >
                {resultMarkdown}
              </ReactMarkdown>
            </article>

            {/* アクションボタン（トップへ戻るなど） */}
            <div className="flex justify-center">
              <button
                onClick={() => router.push("/")}
                className="text-emerald-900 text-sm font-bold border-b border-emerald-900 pb-0.5 hover:opacity-70 transition-opacity"
              >
                BACK TO HOME
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
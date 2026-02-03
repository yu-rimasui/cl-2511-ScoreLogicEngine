// app/test/page.tsx
"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LOGIC_PROMPT } from "@/lib/prompts";
import { ScoreData } from "@/types/score";
import { useAnalysis } from "@/hooks/useAnalysis"; // フック読み込み
import { auth } from "@/lib/firebase"; // Auth読み込み

export default function TestPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [pastDataInput, setPastDataInput] = useState("");
  const [promptInput, setPromptInput] = useState(LOGIC_PROMPT);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ▼ 追加: 保存するかどうかのステート
  const [saveToFirestore, setSaveToFirestore] = useState(false);
  
  // ▼ 追加: 過去データ取得機能
  const { fetchPastSummaries } = useAnalysis();

  const handleLoadPastData = async () => {
    if (!auth.currentUser) {
      alert("ログインが必要です");
      return;
    }
    setLoading(true);
    try {
      const summary = await fetchPastSummaries();
      setPastDataInput(summary || "※過去データはありませんでした");
    } catch (e) {
      console.error(e);
      alert("過去データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setLoading(true);
      // JSONのバリデーション
      let scoreData: ScoreData;
      try {
        scoreData = JSON.parse(jsonInput);
      } catch (e) {
        console.error("###test: ", e);
        alert("JSONの形式が正しくありません");
        return;
      }

      const res = await fetch("/api/test-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreData,
          pastSummaries: pastDataInput,
          systemPrompt: promptInput,
          saveToFirestore, // 保存フラグ送信
          userId: auth.currentUser?.uid // ユーザーID送信
        }),
      });

      const data = await res.json();
      setResult(data.result);

      if (saveToFirestore) {
        // 保存成功のアナウンス（簡易的）
        alert("分析が完了し、データがFirestoreに追加されました！");
      }

    } catch (e) {
      console.error("###test: ", e);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="">
      {/* 左側：入力エリア */}
      <div className="w-1/2 p-4 bg-stone-100 overflow-y-auto space-y-4 border-r border-stone-200">
        <h1 className="font-bold text-lg text-stone-700">🧪 プロンプト実験室</h1>
        
        {/* 1. JSON Input */}
        <div>
          <label className="block text-xs font-bold mb-1 text-stone-600">1. スコアデータ (JSON)</label>
          <textarea
            className="w-full h-40 p-2 text-xs font-mono border border-stone-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"total_score": 90, "holes": [...]}'
          />
          
          {/* ▼ 追加: Firestore保存オプション */}
          <div className="mt-2 flex items-center space-x-2 bg-emerald-50 p-2 rounded border border-emerald-100">
            <input 
                type="checkbox" 
                id="saveToFirestore" 
                checked={saveToFirestore} 
                onChange={(e) => setSaveToFirestore(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300 cursor-pointer"
            />
            <label htmlFor="saveToFirestore" className="text-xs font-bold text-emerald-800 cursor-pointer select-none">
                実行時にFirestoreへ追加する (本番データとして保存)
            </label>
          </div>
        </div>

        {/* 2. Past Data Input */}
        <div>
          <div className="flex justify-between items-end mb-1">
             <label className="block text-xs font-bold text-stone-600">2. 過去の分析サマリ (テキスト)</label>
             {/* ▼ 追加: 読み込みボタン */}
             <button 
                onClick={handleLoadPastData}
                className="text-[10px] bg-white border border-stone-300 hover:bg-stone-50 px-3 py-1 rounded text-stone-700 font-bold transition-colors shadow-sm flex items-center gap-1"
                disabled={loading}
             >
                <span>🔄</span> Firestoreから最新を取得
             </button>
          </div>
          <textarea
            className="w-full h-32 p-2 text-xs border border-stone-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
            value={pastDataInput}
            onChange={(e) => setPastDataInput(e.target.value)}
            placeholder="前回はパットが課題でした..."
          />
        </div>

        {/* 3. Prompt Input */}
        <div>
          <label className="block text-xs font-bold mb-1 text-stone-600">3. システムプロンプト (編集可能)</label>
          <textarea
            className="w-full h-[300px] p-2 text-xs font-mono border border-stone-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
        </div>

        <button
          onClick={handleTest}
          disabled={loading}
          className={`w-full py-3 font-bold rounded shadow-sm transition-colors ${
            loading 
              ? "bg-stone-400 cursor-not-allowed" 
              : "bg-emerald-900 text-white hover:bg-emerald-800"
          }`}
        >
          {loading ? "分析中..." : "実験実行 🚀"}
        </button>
      </div>

      {/* 右側：結果表示エリア */}
      <div className="w-1/2 p-8 bg-stone-50 overflow-y-auto">
        <h2 className="font-bold text-lg mb-4 text-stone-700">📊 分析結果プレビュー</h2>
        
        {/* 結果がある場合のみカードを表示 */}
        {result && (
          <article className="prose prose-stone prose-emerald max-w-none bg-white p-8 rounded-sm shadow-sm border border-stone-100 animate-fade-in">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
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
              {result}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
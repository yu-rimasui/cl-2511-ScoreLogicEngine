"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRegisterScore } from "@/hooks/useRegisterScore";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";


export default function RegisterScore() {
  const router = useRouter();

  const { 
    file, 
    previewUrl, 
    loading, 
    ocrResult, 
    handleFileSelect, 
    executeOcr,
    updateScoreData,
    saveScore 
  } = useRegisterScore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const courseTextareaRef = useRef<HTMLTextAreaElement>(null);

  // textareaの高さを自動調整
  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  // ホールごとのスコア変更ハンドラ
  const handleHoleChange = (index: number, field: "score" | "putts", value: string) => {
    if (!ocrResult || !ocrResult.holes) return;
    
    const newHoles = [...ocrResult.holes];
    
    // 空文字の場合は null
    if (value === "") {
      newHoles[index] = {
        ...newHoles[index],
        [field]: null
      };
    } else {
      const numValue = Number(value);
      if (!Number.isNaN(numValue)) {
        newHoles[index] = {
          ...newHoles[index],
          [field]: numValue
        };
      }
    }

    // 合計スコアの再計算
    const newTotalScore = newHoles.reduce((sum, h) => sum + (h.score || 0), 0);

    // ScoreData全体の更新
    // ※ half_scores の再計算ロジックを入れるとなお良いですが、必須ではありません
    updateScoreData({
      ...ocrResult,
      holes: newHoles,
      total_score: newTotalScore
    });
  };

  // バリデーション
  const hasError = 
    !ocrResult?.date || 
    !ocrResult?.course_name ||
    ocrResult?.holes?.some(h => 
      !h.score || h.score < 1 || h.score > 15 || 
      h.putts === null || h.putts === undefined || h.putts < 0 || h.putts > 7
    );

  const handleSaveAndRedirect = async () => {
    const scoreId = await saveScore();
    if (scoreId) {
      router.push(`/result?scoreId=${scoreId}`);
    }
  };

  // ▼ セクション名を取得するヘルパー関数
  const getSectionName = (playOrder: number) => {
    if (!ocrResult?.half_scores) return playOrder <= 9 ? "OUT" : "IN";
    return playOrder <= 9 
      ? ocrResult.half_scores.first_half.section_name 
      : ocrResult.half_scores.second_half.section_name;
  };

  // ▼ 表示モード切り替え ▼
  if (ocrResult) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-stone-100">
        
        {/* === 上半分：画像確認エリア === */}
        <div className="h-2/5 bg-stone-900 relative overflow-hidden flex items-center justify-center border-b border-stone-700">
          {previewUrl && (
            <TransformWrapper initialScale={1} minScale={0.5} maxScale={4} centerOnInit={true}>
              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                <img src={previewUrl} alt="Scorecard Preview" className="max-w-none w-auto h-auto max-h-full object-contain" />
              </TransformComponent>
            </TransformWrapper>
          )}
          <div className="absolute top-4 left-4 z-10">
            <button onClick={() => updateScoreData(null)} className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white/20">
              ← 再アップロード
            </button>
          </div>
          <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
            <span className="bg-black/50 text-white px-2 py-1 rounded text-[10px] backdrop-blur-sm">ピンチで拡大縮小</span>
          </div>
        </div>

        {/* === 下半分：編集フォームエリア === */}
        <div className="h-3/5 flex flex-col bg-white relative">
          
          {/* ヘッダー */}
          <div className="px-4 py-2 bg-emerald-900 text-white flex justify-between items-center shrink-0">
            <h2 className="font-serif tracking-widest text-xs">CHECK & CORRECT</h2>
            <div className="text-xs font-mono">
              TOTAL: <span className="text-lg font-bold">{ocrResult.total_score}</span>
            </div>
          </div>

          {/* スクロールエリア */}
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            
            {/* 基本情報 */}
            <div className="grid grid-cols-10 gap-4 mb-6">
              <div className="col-span-3">
                <label className="block text-[10px] font-bold text-stone-400 mb-1">DATE</label>
                <input 
                  type="date" 
                  value={ocrResult.date || ""}
                  onChange={(e) => updateScoreData({...ocrResult, date: e.target.value})}
                  className={`w-full text-sm border-b py-1 font-medium focus:outline-none ${!ocrResult.date ? "bg-red-50 border-red-300 text-red-600" : "border-stone-300 bg-transparent focus:border-emerald-600"}`}
                />
              </div>
              <div className="col-span-7">
                <label className="block text-[10px] font-bold text-stone-400 mb-1">COURSE</label>
                <textarea 
                  ref={courseTextareaRef}
                  value={ocrResult.course_name || ""}
                  placeholder="コース名"
                  onChange={(e) => { handleTextareaResize(e); updateScoreData({...ocrResult, course_name: e.target.value}); }}
                  className={`w-full text-sm border-b py-1 font-medium focus:outline-none resize-none ${!ocrResult.course_name ? "bg-red-50 border-red-300 text-red-600 placeholder-red-300" : "border-stone-300 bg-transparent focus:border-emerald-600"}`}
                />
              </div>
            </div>

            {/* スコアテーブル */}
            <div className="border border-stone-200 rounded-sm overflow-hidden text-sm">
              <div className="grid grid-cols-12 bg-stone-100 py-2 text-center text-[10px] font-bold text-stone-500 border-b border-stone-200">
                <div className="col-span-1">No.</div> {/* play_order */}
                <div className="col-span-1">H</div>   {/* display_number */}
                <div className="col-span-2">PAR</div>
                <div className="col-span-4 border-r border-stone-200">SCORE</div>
                <div className="col-span-4">PUTT</div>
              </div>
              
              {ocrResult.holes?.map((hole, index) => {
                // セクション区切り（9ホールの後）にヘッダーを入れる演出
                const showSectionHeader = index === 0 || index === 9;
                
                return (
                  <React.Fragment key={index}>
                    {/* セクションヘッダー (OUT / IN など) */}
                    {showSectionHeader && (
                      <div className="bg-emerald-50/80 text-emerald-800 text-[10px] font-bold px-3 py-1 border-b border-stone-100 flex justify-between items-center">
                        <span>{getSectionName(hole.play_order)} COURSE</span>
                        <span className="text-[9px] opacity-70">Hole {hole.play_order}-{hole.play_order + 8}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-12 border-b border-stone-100 last:border-0 items-center">
                      
                      {/* No. (play_order) - 回った順 */}
                      <div className="col-span-1 text-center text-[10px] text-stone-400 font-mono">
                        {hole.play_order}
                      </div>

                      {/* H (display_number) - カード表記 */}
                      <div className="col-span-1 flex items-center justify-center font-bold text-emerald-800 text-xs">
                        {hole.display_number}
                      </div>

                      {/* PAR */}
                      <div className="col-span-2 text-center text-xs font-medium text-stone-600">
                        {hole.par}
                      </div>

                      {/* SCORE入力 */}
                      <div className="col-span-4 border-r border-stone-100">
                        <input
                          type="number"
                          value={hole.score ?? ""}
                          onChange={(e) => handleHoleChange(index, "score", e.target.value)}
                          className={`w-full text-center py-3 outline-none font-bold text-base ${
                            !hole.score || hole.score < 1 || hole.score > 15
                              ? "bg-red-50 text-red-600" 
                              : "focus:bg-emerald-50 text-stone-900"
                          }`}
                        />
                      </div>

                      {/* PUTT入力 */}
                      <div className="col-span-4">
                        <input
                          type="number"
                          value={hole.putts ?? ""}
                          placeholder="-"
                          onChange={(e) => handleHoleChange(index, "putts", e.target.value)}
                          className={`w-full text-center py-3 outline-none font-medium ${
                            hole.putts === null || hole.putts === undefined || hole.putts < 0 || hole.putts > 7
                              ? "bg-red-50 text-red-600" 
                              : "focus:bg-emerald-50 text-stone-500"
                          }`}
                        />
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* フッター */}
          <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur border-t border-stone-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
            <button
              onClick={handleSaveAndRedirect}
              disabled={loading || hasError}
              className={`w-full py-3 rounded-sm font-semibold tracking-widest shadow-md transition-colors text-sm ${
                hasError ? "bg-red-50 text-red-600 cursor-not-allowed" : "bg-emerald-900 text-white hover:bg-emerald-800"
              }`}
            >
              {loading ? "SENDING..." : hasError ? "PLEASE FIX ERRORS" : "CONFIRM"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // アップロード画面 (変更なし)
  return (
    <div className="w-full max-w-md px-6 py-12 flex flex-col gap-10 bg-stone-50">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-serif text-emerald-950 tracking-widest">SCORE CARD</h1>
        <div className="h-0.5 w-12 bg-emerald-800 mx-auto opacity-80"></div>
        <p className="text-xs text-stone-500 font-medium tracking-wider uppercase">Upload</p>
      </div>

      <div className="w-full space-y-6">
        <div
          className={`relative group cursor-pointer overflow-hidden rounded-sm bg-white border transition-all duration-300 ease-out h-80 flex flex-col items-center justify-center ${previewUrl ? "border-emerald-900/10 shadow-md" : "border-dashed border-stone-300 hover:border-emerald-800/50 hover:bg-emerald-50/10"}`}
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <Image src={previewUrl} alt="Preview" fill className="object-contain p-2" />
          ) : (
            <div className="text-center space-y-4 p-6 transition-transform duration-300 group-hover:scale-105">
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400"><span className="text-3xl">📷</span></div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-900">写真を撮影または選択</p>
                <p className="text-xs text-stone-400">鮮明なスコアカード画像をアップロード</p>
              </div>
            </div>
          )}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files?.[0])} className="hidden" />
        </div>
        <button
          onClick={executeOcr}
          disabled={!file || loading}
          className={`w-full py-4 rounded-sm text-sm font-semibold tracking-widest uppercase shadow-sm transition-all duration-300 ${!file || loading ? "bg-stone-200 text-stone-400 cursor-not-allowed" : "bg-emerald-900 text-white hover:bg-emerald-800 hover:shadow-md"}`}
        >
          {loading ? "Loading..." : "Load Score"}
        </button>
      </div>
    </div>
  );
}
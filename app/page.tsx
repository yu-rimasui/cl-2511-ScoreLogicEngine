"use client";

import React from "react";
import { useLiff } from "@/context/LiffContext";
import RegisterScore from "@/components/RegisterScore";

export default function Home() {
  const { isLoggedIn, login } = useLiff();

  // 未ログイン時：ランディングページ（LP）表示
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 px-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl font-serif font-medium tracking-wider text-emerald-900">
              スコア LOGIC engine
            </h1>
          </div>
          <p className="text-sm text-stone-600 font-light leading-relaxed">
            スコアカードから、あなたの実力を紐解く。
            <br />
            LINEログインで分析を開始します。
          </p>
          <button
            onClick={() => login()}
            className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white py-3.5 px-6 rounded-sm text-sm font-medium tracking-wide shadow-sm transition-all duration-300 ease-in-out"
          >
            LINEアカウントでログイン
          </button>
        </div>
      </div>
    );
  }

  // ログイン済み：解析機能コンポーネントを表示
  return (
    <div className="min-h-screen flex flex-col items-center bg-stone-50 text-stone-800 font-sans">
      <RegisterScore />
    </div>
  );
}
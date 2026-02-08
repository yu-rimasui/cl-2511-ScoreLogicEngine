"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase"; // Firebase設定をインポート
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import RegisterScore from "@/components/RegisterScore";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. ログイン状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. ゲストログイン（匿名認証）処理
  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
      // 成功すると onAuthStateChanged が検知して自動的に画面が切り替わります
    } catch (error) {
      console.error("Login failed", error);
      alert("ログインに失敗しました");
      setLoading(false);
    }
  };

  // 3. ローディング中の表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // 4. ログイン済み：解析機能コンポーネントを表示
  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-stone-50 text-stone-800 font-sans">
        <RegisterScore />
      </div>
    );
  }

  // 5. 未ログイン：ランディングページ（LP）表示
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
          <span className="text-xs text-stone-400 block mt-2">
            ※ポートフォリオ版のため、登録不要でお試しいただけます
          </span>
        </p>
        
        <button
          onClick={handleGuestLogin}
          className="w-full bg-emerald-900 hover:bg-emerald-800 text-white py-3.5 px-6 rounded-sm text-sm font-medium tracking-wide shadow-sm transition-all duration-300 ease-in-out"
        >
          デモを試す（ログイン不要）
        </button>
      </div>
    </div>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useLiff } from "@/context/LiffContext";
import { LOGIC_PROMPT } from "@/lib/prompts";

// ★ここに管理者のUIDを列挙してください
const ADMIN_UIDS = [
  process.env.NEXT_PUBLIC_ADMIN_UIDS
];

export default function AdminPage() {
  const { isLoggedIn, login } = useLiff();
  const [prompt, setPrompt] = useState(LOGIC_PROMPT);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // ログインチェック & 管理者チェック
    if (auth.currentUser) {
      // ※簡易的なチェックです。本番ではFirestoreのSecurity Rulesも併用を推奨
      if (ADMIN_UIDS.includes(auth.currentUser.uid)) {
        setIsAdmin(true);
        fetchCurrentPrompt();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [auth.currentUser]);

  const fetchCurrentPrompt = async () => {
    try {
      const docRef = doc(db, "config", "system_prompts");
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        setPrompt(snap.data().prompt);
      } else {
        // まだ保存されていない場合は、コード内のデフォルト値を表示
        setPrompt(LOGIC_PROMPT);
      }
    } catch (error) {
      console.error("Load Error:", error);
      setMessage("プロンプトの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!prompt) return;
    if (!confirm("プロンプトを更新しますか？\nこれ以降の全ての分析に影響します。")) return;

    setMessage("保存中...");
    try {
      // config/system_prompts ドキュメントに保存
      await setDoc(doc(db, "config", "system_prompts"), {
        prompt: prompt,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.uid
      });
      setMessage("✅ 保存しました！");
      
      // 3秒後にメッセージを消す
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Save Error:", error);
      setMessage("❌ 保存に失敗しました");
    }
  };

  const handleReset = () => {
    if (confirm("初期設定（コード内のデフォルト値）に戻しますか？")) {
      setPrompt(LOGIC_PROMPT);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="p-10 text-center">
        <p className="mb-4">管理者ログインが必要です</p>
        <button onClick={() => login()} className="bg-emerald-900 text-white px-4 py-2 rounded">
          LINEログイン
        </button>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="p-10 text-center text-red-600 font-bold">
        アクセス権限がありません。<br/>
        (UID: {auth.currentUser?.uid})
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-emerald-900 mb-2">🔧 管理者画面</h1>
        <p className="text-sm text-stone-500 mb-6">
          ここでの変更は「次回の分析」から即座に反映されます。<br/>
          過去の分析結果は変更されません。
        </p>

        {message && (
          <div className={`p-4 mb-4 rounded ${message.includes("❌") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
            {message}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-bold text-stone-700 mb-2">システムプロンプト</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-[60vh] p-4 text-sm font-mono border border-stone-300 rounded focus:outline-none focus:border-emerald-600 bg-stone-50"
            spellCheck={false}
          />
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-stone-100">
          <button
            onClick={handleReset}
            className="text-stone-500 text-sm underline hover:text-stone-800"
          >
            デフォルトに戻す
          </button>

          <button
            onClick={handleSave}
            className="bg-emerald-900 text-white px-8 py-3 rounded hover:bg-emerald-800 font-bold shadow transition-transform active:scale-95"
          >
            設定を保存する
          </button>
        </div>
      </div>
    </div>
  );
}
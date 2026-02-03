import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { ScoreData } from "@/types/score";

export const useRegisterScore = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<ScoreData | null>(null);

  // 画像選択
  const handleFileSelect = (selectedFile: File | undefined) => {
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setOcrResult(null);
    }
  };

  // データの修正（ユーザーが入力フォームで値を書き換えた時に呼ぶ）
  const updateScoreData = (newData: ScoreData | null) => {
    setOcrResult(newData);
    console.log(ocrResult);
  };

  // OCR実行
  const executeOcr = async () => {
    if (!file) return;
    setLoading(true);

    try {
      // 1. Base64変換 (Geminiに送るために必須)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
      });

      // 2. APIへ送信
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
        }),
      });

      if (!response.ok) throw new Error("Server Error");

      const data: ScoreData = await response.json();
      setOcrResult(data);

    } catch (error) {
      console.error("OCR Error:", error);
      alert("OCRに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // Firestoreへ保存
  const saveScore = async () => {
    if (!ocrResult || !auth.currentUser) {
      alert("ログインしていないか、データがありません");
      return null;
    }
    
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      // ユーザーごとのサブコレクション 'scores' に保存
      // パス: users/{uid}/scores/{docId}
      const docRef = await addDoc(collection(db, "users", uid, "scores"), {
        ...ocrResult,
        createdAt: serverTimestamp(),
      });
      
      // alert("スコアを保存しました！");

      return docRef.id; // 保存したドキュメントIDを返す

    } catch (error) {
      console.error("Save Error:", error);
      alert("保存に失敗しました");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    file,
    previewUrl,
    loading,
    ocrResult,
    handleFileSelect,
    executeOcr,
    updateScoreData,
    saveScore,
  };
};
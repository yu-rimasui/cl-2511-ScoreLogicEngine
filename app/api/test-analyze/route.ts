// app/api/test-analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    // saveToFirestore と userId を受け取るように追加
    const { scoreData, pastSummaries, systemPrompt, saveToFirestore, userId } = await req.json();

    // ユーザーコードに合わせて gemini-2.5-flash-lite を使用
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // ユーザープロンプトの構築（本番と同じロジック）
    const userPrompt = `
      ${systemPrompt}

      =========================================
      【今回のスコアデータ】
      ${JSON.stringify(scoreData, null, 2)}

      ${pastSummaries ? pastSummaries : "※過去のデータはありません。"}
      =========================================

      上記データに基づき、マークダウン形式でレポートを作成してください。
      `;

    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();

    // ▼ Firestore保存処理 (チェックが入っていて、ユーザーIDがある場合のみ)
    if (saveToFirestore && userId) {
      try {
        console.log("Saving to Firestore for user:", userId);
        await adminDb.collection("users").doc(userId).collection("scores").add({
           ...scoreData,
           analysis_result: responseText,
           createdAt: FieldValue.serverTimestamp(),
           updatedAt: FieldValue.serverTimestamp(),
           status: "analyzed" // テスト経由なので analyzed 済みとする
        });
        console.log("Save successful");
      } catch (dbError) {
        console.error("Firestore Save Error:", dbError);
        // 保存エラーでも分析結果は返すため、ここではログ出力のみ
      }
    }

    return NextResponse.json({ result: responseText });

  } catch (error) {
    console.error("%%test-analyze API: ", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
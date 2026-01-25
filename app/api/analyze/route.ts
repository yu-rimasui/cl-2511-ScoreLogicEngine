import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "@/lib/firebaseAdmin"; // サーバーサイド用Firestore
import { LOGIC_PROMPT } from "@/lib/prompts"; // デフォルトのプロンプト

// APIキーの準備
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: NextRequest) {
  console.log("%%%%API: /api/analyze 呼び出し開始");

  try {
    const body = await req.json();
    const { scoreData, pastSummaries, userId, scoreId } = body;

    // バリデーション
    if (!scoreData || !userId || !scoreId) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    let systemPrompt = LOGIC_PROMPT; // デフォルト値

    try {
      // Firestoreの 'config/system_prompts' ドキュメントから最新のプロンプトを取得
      const promptDoc = await adminDb.collection("config").doc("system_prompts").get();
      if (promptDoc.exists) {
        const data = promptDoc.data();
        if (data?.prompt) {
          systemPrompt = data.prompt;
          console.log("%%%%API: Firestoreから最新プロンプトをロードしました");
        }
      }
    } catch (e) {
      console.warn("%%%%API: プロンプト取得失敗。デフォルトを使用します。", e);
    }

    // Gemini Flash latestモデルの準備
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
    });

    // ユーザープロンプトの作成
    const userPrompt = `
      ${systemPrompt}

      =========================================
      【今回のスコアデータ】
      ${JSON.stringify(scoreData, null, 2)}

      ${pastSummaries ? pastSummaries : "※過去のデータはありません。"}
      =========================================

      上記データに基づき、マークダウン形式でレポートを作成してください。
      `;

    console.log("%%%%API: Geminiへ分析リクエスト送信");

    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();

    console.log("%%%%API: 分析完了。Firestoreへ保存します。");

    // Firestoreへ保存
    await adminDb
      .collection("users")
      .doc(userId)
      .collection("scores")
      .doc(scoreId)
      .update({
        analysis_result: responseText,
        analyzedAt: new Date(),
        status: "analyzed"
      });

    console.log("%%%%API: 保存完了");

    return NextResponse.json({ result: responseText });

  } catch (error) {
    console.error("%%%%API: 分析エラー", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
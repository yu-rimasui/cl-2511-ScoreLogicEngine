import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "@/lib/firebaseAdmin"; // サーバーサイド用Firestore
import { LOGIC_PROMPT } from "@/lib/prompts";

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

    // 1. Gemini Flash latestモデルの準備
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      // Markdownテキストを生成するため、JSONモードはOFFにします
    });

    // 2. ユーザープロンプト（今回のデータ + 過去の文脈）の作成
    // システムプロンプト(INABA_LOGIC_PROMPT)は別途Gemini側で処理されますが、
    // 確実性を高めるため、ここではユーザーメッセージの冒頭に指示を含める構成にします。
    const userPrompt = `
${LOGIC_PROMPT}

=========================================
【今回のスコアデータ】
${JSON.stringify(scoreData, null, 2)}

${pastSummaries ? pastSummaries : "※過去のデータはありません。"}
=========================================

上記データに基づき、マークダウン形式でレポートを作成してください。
`;

    console.log("%%%%API: Geminiへ分析リクエスト送信");

    // 3. Geminiへ送信
    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();

    console.log("%%%%API: 分析完了。Firestoreへ保存します。");

    // 4. Firestoreへ保存 (analysis_result フィールドを追加)
    // パス: users/{userId}/scores/{scoreId}
    await adminDb
      .collection("users")
      .doc(userId)
      .collection("scores")
      .doc(scoreId)
      .update({
        analysis_result: responseText,
        analyzedAt: new Date(), // 分析時刻
        status: "analyzed"      // ステータス更新
      });

    console.log("%%%%API: 保存完了");

    // フロントエンドにレポートを返す
    return NextResponse.json({ result: responseText });

  } catch (error) {
    console.error("%%%%API: 分析エラー", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
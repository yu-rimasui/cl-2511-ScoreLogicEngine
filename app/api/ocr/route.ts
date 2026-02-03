import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// サーバーサイドでAPIキーを読み込みます
// .env.local に GOOGLE_API_KEY が設定されている前提です
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: NextRequest) {
  console.log("%%%%API: /api/ocr 呼び出し開始");

  try {
    // 1. リクエストボディから画像データを取得
    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      console.error("%%%%API: 画像データがありません");
      return NextResponse.json({ error: "No image data" }, { status: 400 });
    }

    // 2. Gemini Flash latestモデルの準備 (JSONモード有効化)
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" }
    });

    console.log("%%%%API: Geminiへ解析リクエスト送信");

    // 3. プロンプト（解析指示書）の作成
    // フロントエンドの型定義 (ScoreData) に合わせたJSON構造を指定します
    const prompt = `
      このゴルフスコアカードの画像を分析し、以下のJSONスキーマに従ってデータを抽出してください。
      数値が読み取れない、または記載がない場合は null を使用してください。

      【重要：データの解釈ルール】
      1. 物理的なカードの「左側（または上段）」を「前半ハーフ」、「右側（または下段）」を「後半ハーフ」として扱います。
      2. 「play_order」は回った順序（1〜18）です。「display_number」はカードに印字されているホール番号（例: INスタートなら前半のdisplay_numberは10,11...となる）です。
      3. 「section_name」には、"OUT", "IN", "東", "西", "南", "北" などのコース区分を正確に転記してください。
      4. 「relative_score」は自動計算してください (score - par)。

      出力フォーマット:
      {
        "course_name": "コース名（文字列）",
        "date": "日付（YYYY-MM-DD形式）",
        "weather": "天気（記載があれば文字列、なければnull）",
        "memo": "メモ（記載があれば文字列、なければnull）",
        "total_score": 合計スコア（数値）,
        "total_putts": 合計パット数（数値）,
        "total_par": 合計パー数（数値）,
        
        "half_scores": {
          "first_half": {
            "section_name": "前半の区分名 (例: OUT, IN, 西)",
            "total_score": 数値,
            "total_par": 数値,
            "total_putts": 数値,
            "relative_score": 数値 (total_score - total_par)
          },
          "second_half": {
            "section_name": "後半の区分名 (例: IN, OUT, 東)",
            "total_score": 数値,
            "total_par": 数値,
            "total_putts": 数値,
            "relative_score": 数値 (total_score - total_par)
          }
        },

        "holes": [
          // 必ず play_order: 1 から 18 までの配列を作成してください
          { 
            "play_order": 1, 
            "display_number": カード上のホール番号（数値）, 
            "par": 数値, 
            "score": 数値, 
            "putts": 数値,
            "relative_score": 数値 (score - par),
            "yardage": 距離（数値、記載あれば）,
            "handicap": ハンディキャップ（数値、記載あれば）,
            "is_fairway_keep": FWキープ判定 (○やチェックがあればtrue, ×ならfalse, 不明はnull),
            "is_par_on": パーオン判定 (○やチェックがあればtrue, ×ならfalse, 不明はnull)
          },
          ... (play_order 18まで)
        ]
      }
      
      注意点:
      - 手書き文字を正確に読み取ってください。
      - "holes" 配列には必ず18ホール分のデータを含めてください。データ不足の箇所はnullで埋めてください。
    `;


    // 4. Geminiへ送信
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || "image/jpeg",
        },
      },
    ]);

    // 5. 結果の取得と整形
    const responseText = result.response.text();
    console.log("%%%%API: Geminiからの応答受信完了");
    
    // JSONとしてパースできるか確認してから返す
    try {
      const jsonResponse = JSON.parse(responseText);
      return NextResponse.json(jsonResponse);
    } catch (parseError) {
      console.error("%%%%API: JSONパースエラー", parseError);
      console.error("Original Text:", responseText);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

  } catch (error) {
    console.error("%%%%API: サーバー内部エラー", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
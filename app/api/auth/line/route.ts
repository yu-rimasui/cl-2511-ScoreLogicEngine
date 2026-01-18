import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

export async function POST(req: NextRequest) {
  console.log("%%%%API: /api/autj/line 呼び出し開始");
  
  try {
    const body = await req.json();
    const { lineIdToken } = body;

    if (!lineIdToken) {
      console.error("%%%%API: ID Tokenがありません");
      return NextResponse.json({ error: "ID Token is missing" }, { status: 400 });
    }

    // 1. LINEのIDトークンを検証 (LINE APIを叩く)
    const params = new URLSearchParams();
    params.append("id_token", lineIdToken);
    params.append("client_id", process.env.NEXT_PUBLIC_CHANNEL_ID || "");

    const lineResponse = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!lineResponse.ok) {
      const err = await lineResponse.json();
      console.error("LINE Token Verify Error:", err);
      return NextResponse.json({ error: "Invalid LINE Token" }, { status: 401 });
    }

    const lineUser = await lineResponse.json();
    const uid = `line:${lineUser.sub}`; // LINEのIDをFirebaseのUIDとして使用
    const name = lineUser.name;
    const picture = lineUser.picture;
    console.log("%%%%API: LINE認証成功", uid);
    

    // 2. Firebaseのカスタムトークンを作成
    const firebaseToken = await adminAuth.createCustomToken(uid);

    // 3. 初回ユーザーならFirestoreに保存 (ユーザーDB作成)
    const userRef = adminDb.collection("users").doc(uid);
    const doc = await userRef.get();
    
    if (!doc.exists) {
      console.log("%%%%API: 新規ユーザー。DBに保存します。");
      
      await userRef.set({
        uid: uid,
        displayName: name,
        photoURL: picture,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("%%%%API: DB保存完了");
    } else {
      console.log("%%%%API: 既存ユーザーのため。DB保存はスキップ");
    }

    return NextResponse.json({ firebaseToken });

  } catch (error) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
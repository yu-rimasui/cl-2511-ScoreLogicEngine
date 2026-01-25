"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLiff } from "@/context/LiffContext";
import AnalyzeScore from "@/components/AnalyzeScore";

function ResultContent() {
  const searchParams = useSearchParams();
  const scoreId = searchParams.get("scoreId");
  const { isLoggedIn } = useLiff();

  if (!isLoggedIn) {
    return <div className="p-10 text-center">ログインが必要です</div>;
  }

  if (!scoreId) {
    return <div className="p-10 text-center">データが指定されていません</div>;
  }

  return <AnalyzeScore scoreId={scoreId} />;
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <ResultContent />
    </Suspense>
  );
}
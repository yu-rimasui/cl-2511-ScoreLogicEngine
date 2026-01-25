"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

// データ型定義
export interface HoleData {
  hole: number
  par: number
  score: number
}

// 稲葉様のスコアデータ（初期値）
export const mockScorecard: HoleData[] = [
  // OUT Course (1-9)
  { hole: 1, par: 1, score: 1 },
  { hole: 2, par: 4, score: 4 },
  { hole: 3, par: 5, score: 5 },
  { hole: 4, par: 4, score: 4 },
  { hole: 5, par: 3, score: 3 },
  { hole: 6, par: 5, score: 9 },
  { hole: 7, par: 4, score: 6 },
  { hole: 8, par: 3, score: 3 },
  { hole: 9, par: 4, score: 5 },
  // IN Course (10-18)
  { hole: 10, par: 4, score: 7 },
  { hole: 11, par: 4, score: 5 },
  { hole: 12, par: 3, score: 4 },
  { hole: 13, par: 5, score: 6 },
  { hole: 14, par: 4, score: 4 },
  { hole: 15, par: 4, score: 6 },
  { hole: 16, par: 3, score: 4 },
  { hole: 17, par: 5, score: 6 },
  { hole: 18, par: 4, score: 5 },
]

interface GolfContextType {
  holes: HoleData[]
  setHoles: (holes: HoleData[]) => void
  imagePreview: string | null
  setImagePreview: (url: string | null) => void
}

const GolfContext = createContext<GolfContextType | undefined>(undefined)

export function GolfProvider({ children }: { children: ReactNode }) {
  const [holes, setHoles] = useState<HoleData[]>(mockScorecard)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  return (
    <GolfContext.Provider value={{ holes, setHoles, imagePreview, setImagePreview }}>
      {children}
    </GolfContext.Provider>
  )
}

export function useGolf() {
  const context = useContext(GolfContext)
  if (context === undefined) {
    throw new Error("useGolf must be used within a GolfProvider")
  }
  return context
}
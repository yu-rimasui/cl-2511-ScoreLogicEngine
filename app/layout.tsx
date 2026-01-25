import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../styles/globals.css"
import { GolfProvider } from "../context/GolfContext"
import { LiffProvider } from "../context/LiffContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "スコア LOGIC engine",
  description: "スコアカードから、あなたのゴルフスキルを紐解く。",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <LiffProvider>
          <GolfProvider>
            {children}
          </GolfProvider>
        </LiffProvider>
      </body>
    </html>
  )
}
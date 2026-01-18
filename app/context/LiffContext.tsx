"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import liff from "@line/liff"
import { signInWithCustomToken, signOut, User } from "firebase/auth"
import { auth } from "@/lib/firebase" // Firebase SDKのauthインスタンスをインポート


interface LiffContextType {
  liffObject: typeof liff | null
  isLoggedIn: boolean
  user: User | null
  login: () => void
  logout: () => void
}

const LiffContext = createContext<LiffContextType | undefined>(undefined)

export function LiffProvider({ children }: { children: ReactNode }) {
  const [liffObject, setLiffObject] = useState<typeof liff | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // firebaseのログイン状態監視
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser)
    })

    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) return

        await liff.init({ liffId })
        setLiffObject(liff)

        if (liff.isLoggedIn()) {
          setIsLoggedIn(true)

          // LINEログイン済み ∧ Firebase未ログイン の場合 
          if (!auth.currentUser) {
            const idToken = liff.getIDToken()
            if (idToken) {
              await loginToFirebase(idToken) // firebaseへ連携ログイン
            }
          }
        }
      } catch ( error ) {
        console.error("LIFF init failed", error)
        // LIFFを初期化できず、APIが利用できない状態
      }
    }
      initLiff()
  return () => unsubscribe()

  }, [])

  // firebaseへ連携ログインする関数
  const loginToFirebase = async (lineIdToken: string) => {
    try {
      const res = await fetch("/api/auth/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineIdToken }),
      })

      if (!res.ok) throw new Error("Failed to fetch custom token")
      
      const { firebaseToken } = await res.json()

      // Firebaseにサインイン
      await signInWithCustomToken(auth, firebaseToken)
      console.log("Firebase Login Success!");
    } catch (error) {
      console.error("Firebase Login error:", error);
    }
  }

  const login = () => {
    if (liffObject && !isLoggedIn ) {
      liffObject.login()
    }
  }

  const logout = async () => {
    if (liffObject && isLoggedIn ) {
      liffObject.logout()
      await signOut(auth) // firabeseからもログアウト
      setIsLoggedIn(false)
      setUser(null)
      window.location.reload()
    }
  }

  return (
    <LiffContext.Provider value={{ liffObject, isLoggedIn, user, login, logout }}>
      {children}
    </LiffContext.Provider>
  )
}

export function useLiff() {
  const context = useContext(LiffContext)
  if (context === undefined) {
    throw new Error("useLiff must be used within a LiffProvider")
  }
  return context
}
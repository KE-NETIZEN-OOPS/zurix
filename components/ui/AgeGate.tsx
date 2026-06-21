'use client'
import { useState, useEffect } from 'react'

const COOKIE_KEY = 'zurix_age_verified'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/`
}

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => { setVerified(getCookie(COOKIE_KEY) === 'yes') }, [])

  function confirm() { setCookie(COOKIE_KEY, 'yes', 30); setVerified(true) }
  function deny() { window.location.href = '/' }

  if (verified === null) return null

  if (!verified) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-6">🔞</div>
        <h1 className="text-3xl font-black text-white mb-3">Adults Only</h1>
        <p className="text-zinc-400 max-w-sm mb-8">
          This section contains adult content for viewers aged 18 and over. By entering you confirm you are 18+.
        </p>
        <div className="flex gap-4">
          <button onClick={confirm} className="bg-amber-500 text-black font-bold px-8 py-3 rounded-full hover:bg-amber-400 transition text-lg">
            I am 18+, Enter
          </button>
          <button onClick={deny} className="border border-zinc-700 text-white px-8 py-3 rounded-full hover:bg-zinc-800 transition text-lg">
            Exit
          </button>
        </div>
        <p className="text-zinc-600 text-xs mt-6 max-w-xs">Confirmation stored in browser for 30 days.</p>
      </div>
    )
  }

  return <>{children}</>
}

import Navbar from '@/components/ui/Navbar'
import { createClient } from '@/lib/supabase/server'
import { THEMES } from '@/lib/tiers'
import type { CSSProperties } from 'react'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let themeName = 'dark'
  if (user) {
    const { data } = await supabase.from('users').select('theme').eq('id', user.id).single()
    themeName = data?.theme ?? 'dark'
  }
  const t = THEMES[themeName] ?? THEMES.dark
  const style = {
    '--bg': t.bg, '--card': t.card, '--border': t.border,
    '--accent': t.accent, '--text': t.text, '--muted': t.muted,
  } as CSSProperties

  return (
    <div style={style} className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <div className="md:pl-56 pt-14 md:pt-0 pb-20 md:pb-0">
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </div>
    </div>
  )
}

'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/explore', label: 'Explore', icon: '🔥' },
  { href: '/posts', label: 'Feed', icon: '📸' },
  { href: '/stories', label: 'Stories', icon: '✨' },
  { href: '/live', label: 'Live', icon: '🔴' },
  { href: '/chat', label: 'Chat', icon: '💬' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<{ avatar_url?: string; display_name?: string; tier?: string } | null>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(setMe).catch(() => {})
  }, [])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-[var(--card)] border-r border-[var(--border)] p-4 gap-1 z-50">
        <Link href="/explore" className="text-[var(--accent)] font-black text-2xl mb-6 px-2">ZuriX</Link>
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className={clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
              isActive(l.href) ? 'bg-[var(--accent)] text-black' : 'text-[var(--muted)] hover:bg-black/20 hover:text-[var(--text)]'
            )}>
            <span>{l.icon}</span>{l.label}
          </Link>
        ))}
        <Link href="/payments"
          className={clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
            isActive('/payments') ? 'bg-[var(--accent)] text-black' : 'text-[var(--muted)] hover:bg-black/20 hover:text-[var(--text)]')}>
          <span>⚡</span>Upgrade
        </Link>

        <div className="mt-auto flex flex-col gap-1 pt-3 border-t border-[var(--border)]">
          <Link href="/me" className={clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
            isActive('/me') ? 'bg-[var(--accent)] text-black' : 'text-[var(--text)] hover:bg-black/20')}>
            <span className="relative w-6 h-6 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
              {me?.avatar_url && <Image src={me.avatar_url} alt="" fill className="object-cover" unoptimized />}
            </span>
            <span className="truncate">{me?.display_name ?? 'My Profile'}</span>
          </Link>
          <Link href="/settings" className="text-[var(--muted)] hover:text-[var(--text)] text-sm px-3 py-2">⚙ Settings</Link>
          <button onClick={logout} className="text-left text-[var(--muted)] hover:text-red-400 text-sm px-3 py-2">⎋ Log out</button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between px-4 z-50">
        <Link href="/explore" className="text-[var(--accent)] font-black text-xl">ZuriX</Link>
        <div className="flex items-center gap-3">
          <Link href="/payments" className="text-xs font-bold bg-[var(--accent)] text-black px-2.5 py-1 rounded-full">⚡ Upgrade</Link>
          <button onClick={logout} className="text-[var(--muted)] text-sm">⎋</button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] flex justify-around py-2 z-50">
        {[...links.slice(0, 4), { href: '/me', label: 'Me', icon: '👤' }].map(l => (
          <Link key={l.href} href={l.href}
            className={clsx('flex flex-col items-center text-[10px] gap-0.5 p-1 w-14',
              isActive(l.href) ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
            )}>
            <span className="text-lg">{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}

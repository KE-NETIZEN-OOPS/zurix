'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const links = [
  { href: '/explore', label: 'Explore', icon: '🔥' },
  { href: '/posts', label: 'Feed', icon: '📸' },
  { href: '/live', label: 'Live', icon: '🔴' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/payments', label: 'Upgrade', icon: '⚡' },
]

export default function Navbar() {
  const pathname = usePathname()
  return (
    <>
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-zinc-900 border-r border-zinc-800 p-4 gap-1 z-50">
        <Link href="/explore" className="text-amber-500 font-bold text-xl mb-6 px-2">ZuriX</Link>
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className={clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
              pathname.startsWith(l.href) ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            )}>
            <span>{l.icon}</span>{l.label}
          </Link>
        ))}
        <Link href="/settings" className="mt-auto text-zinc-500 hover:text-white text-sm px-3 py-2">Settings</Link>
      </nav>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around py-2 z-50">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className={clsx('flex flex-col items-center text-xs gap-1 p-1',
              pathname.startsWith(l.href) ? 'text-amber-500' : 'text-zinc-500'
            )}>
            <span className="text-lg">{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}

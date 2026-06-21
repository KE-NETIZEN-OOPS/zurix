# ZuriX Phase 2: UI Shell + Explore + Profiles

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Dark-themed layout, landing page, explore grid with infinite scroll, and profile pages with likes counter and account age.

**Architecture:** All pages are Next.js App Router server components where possible; client components only for interactive bits (infinite scroll, swipe, modals).

**Tech Stack:** Tailwind CSS (dark theme), SWR for client-side fetching, clsx for conditional classes

## Global Constraints
- Dark background: `#0a0a0a` (bg-zinc-950)
- Gold accent: `#f59e0b` (amber-500)
- All pages mobile-first
- Tier gate wrapper component used on every gated page

---

### Task 6: Global layout + navigation

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `components/ui/Navbar.tsx`
- Create: `components/ui/TierGate.tsx`
- Test: `tests/components/TierGate.test.tsx`

- [ ] **Step 1: Update app/globals.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0a0a0a;
  --accent: #f59e0b;
}

body {
  background-color: var(--bg);
  color: #f4f4f5;
  font-family: 'Inter', sans-serif;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #0a0a0a; }
::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
```

- [ ] **Step 2: Update app/layout.tsx**
```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZuriX — Beautiful Connections. No Limits.',
  description: 'Meet, connect, and vibe with people near you and across the world.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create components/ui/Navbar.tsx**
```tsx
// components/ui/Navbar.tsx
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
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-zinc-900 border-r border-zinc-800 p-4 gap-1 z-50">
        <Link href="/explore" className="text-amber-500 font-bold text-xl mb-6 px-2">ZuriX</Link>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
              pathname.startsWith(l.href)
                ? 'bg-amber-500 text-black'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            )}
          >
            <span>{l.icon}</span>{l.label}
          </Link>
        ))}
        <Link href="/settings" className="mt-auto text-zinc-500 hover:text-white text-sm px-3 py-2">Settings</Link>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around py-2 z-50">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              'flex flex-col items-center text-xs gap-1 p-1',
              pathname.startsWith(l.href) ? 'text-amber-500' : 'text-zinc-500'
            )}
          >
            <span className="text-lg">{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
```

- [ ] **Step 4: Create components/ui/TierGate.tsx**
```tsx
// components/ui/TierGate.tsx
import Link from 'next/link'
import { hasAccess, tierLabel, type Tier } from '@/lib/tiers'

interface Props {
  userTier: Tier
  required: Tier
  children: React.ReactNode
}

export default function TierGate({ userTier, required, children }: Props) {
  if (hasAccess(userTier, required)) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="text-5xl">🔒</div>
      <h2 className="text-xl font-bold text-white">
        {tierLabel(required)} tier required
      </h2>
      <p className="text-zinc-400 max-w-xs">
        Upgrade your plan to unlock this feature.
      </p>
      <Link
        href="/payments"
        className="bg-amber-500 text-black font-bold px-6 py-3 rounded-full hover:bg-amber-400 transition"
      >
        Upgrade Now
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: Write TierGate tests**
```tsx
// tests/components/TierGate.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TierGate from '@/components/ui/TierGate'

describe('TierGate', () => {
  it('renders children when user has access', () => {
    render(
      <TierGate userTier="blaze" required="flame">
        <p>Secret content</p>
      </TierGate>
    )
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })

  it('renders upgrade prompt when user lacks access', () => {
    render(
      <TierGate userTier="free" required="flame">
        <p>Secret content</p>
      </TierGate>
    )
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
    expect(screen.getByText('Upgrade Now')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run tests**
```bash
pnpm test
```
Expected: 9 tests pass

- [ ] **Step 7: Create app/(app)/layout.tsx (authenticated shell)**
```tsx
// app/(app)/layout.tsx
import Navbar from '@/components/ui/Navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:pl-56 pb-16 md:pb-0 min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 8: Commit**
```bash
git add -A && git commit -m "feat: add global layout, Navbar, and TierGate component"
```

---

### Task 7: Landing page

**Files:**
- Create: `app/page.tsx`
- Create: `components/payments/TierCard.tsx`

- [ ] **Step 1: Create components/payments/TierCard.tsx**
```tsx
// components/payments/TierCard.tsx
import Link from 'next/link'
import { TIER_PRICES, tierLabel, type Tier } from '@/lib/tiers'
import clsx from 'clsx'

interface Props {
  tier: Exclude<Tier, 'free'>
  highlighted?: boolean
}

const TIER_FEATURES: Record<Exclude<Tier, 'free'>, string[]> = {
  flame: ['Unlimited likes', 'Follow users', 'Direct messages', 'Post photos'],
  blaze: ['Everything in Flame', 'Stories', 'Spicy content feed', 'Adult video section'],
  inferno: ['Everything in Blaze', 'Watch & go live', 'Chaturbate featured rooms', 'Hide my data', 'Verified badge'],
}

export default function TierCard({ tier, highlighted }: Props) {
  const prices = TIER_PRICES[tier]
  return (
    <div className={clsx(
      'rounded-2xl border p-6 flex flex-col gap-4',
      highlighted
        ? 'border-amber-500 bg-amber-500/10'
        : 'border-zinc-800 bg-zinc-900'
    )}>
      {highlighted && (
        <span className="text-xs font-bold bg-amber-500 text-black px-2 py-1 rounded-full w-fit">
          MOST POPULAR
        </span>
      )}
      <h3 className="text-xl font-bold text-white">{tierLabel(tier)}</h3>
      <div>
        <span className="text-3xl font-bold text-amber-500">KES {prices.monthly}</span>
        <span className="text-zinc-400 text-sm">/month</span>
      </div>
      <p className="text-zinc-500 text-sm">or KES {prices.annual}/year (2 months free)</p>
      <ul className="flex flex-col gap-2 text-sm text-zinc-300">
        {TIER_FEATURES[tier].map(f => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-amber-500">✓</span> {f}
          </li>
        ))}
      </ul>
      <Link
        href={`/payments?tier=${tier}`}
        className={clsx(
          'mt-auto text-center font-bold py-3 rounded-full transition',
          highlighted
            ? 'bg-amber-500 text-black hover:bg-amber-400'
            : 'border border-zinc-700 text-white hover:bg-zinc-800'
        )}
      >
        Get {tierLabel(tier)}
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Create app/page.tsx**
```tsx
// app/page.tsx
import Link from 'next/link'
import TierCard from '@/components/payments/TierCard'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
          <span className="text-amber-500">Zuri</span>X
        </h1>
        <p className="text-xl md:text-2xl text-zinc-300 max-w-xl mb-2">
          Beautiful connections. No limits.
        </p>
        <p className="text-zinc-500 mb-8 max-w-md">
          Meet locals and chat with people from around the world. Explore profiles, go live, and unlock exclusive content.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            href="/register"
            className="bg-amber-500 text-black font-bold px-8 py-3 rounded-full text-lg hover:bg-amber-400 transition"
          >
            Join Free
          </Link>
          <Link
            href="/explore"
            className="border border-zinc-700 text-white px-8 py-3 rounded-full text-lg hover:bg-zinc-800 transition"
          >
            Browse Profiles
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-zinc-800 py-6">
        <div className="max-w-4xl mx-auto flex justify-around text-center px-4">
          {[['508+', 'Profiles'], ['Kenya & Beyond', 'Members from'], ['Live Streaming', 'Feature']].map(([val, label]) => (
            <div key={label}>
              <div className="text-2xl font-bold text-amber-500">{val}</div>
              <div className="text-zinc-500 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-2">Simple pricing</h2>
        <p className="text-zinc-400 text-center mb-10">Unlock more with every tier. Cancel anytime.</p>
        <div className="grid md:grid-cols-3 gap-6">
          <TierCard tier="flame" />
          <TierCard tier="blaze" highlighted />
          <TierCard tier="inferno" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 text-center text-zinc-600 text-sm">
        © 2026 ZuriX · Kenya · All rights reserved · 18+ only
      </footer>
    </main>
  )
}
```

- [ ] **Step 3: Start dev server and verify**
```bash
pnpm dev
```
Open http://localhost:3000 — verify hero, stats, 3 tier cards render correctly.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: add landing page with hero and tier pricing cards"
```

---

### Task 8: Auth pages (register + login)

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/api/auth/register/route.ts`

- [ ] **Step 1: Create app/(auth)/layout.tsx**
```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-center mb-8">
          <span className="text-amber-500">Zuri</span>X
        </h1>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create app/(auth)/register/page.tsx**
```tsx
// app/(auth)/register/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', display_name: '', age: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (parseInt(form.age) < 18) { setError('You must be 18 or older to join ZuriX.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (signUpError || !data.user) { setError(signUpError?.message ?? 'Sign up failed'); setLoading(false); return }

    const username = form.display_name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 999)
    await supabase.from('users').insert({
      id: data.user.id,
      username,
      display_name: form.display_name,
      email: form.email,
      phone: form.phone,
      age: parseInt(form.age),
    })
    router.push('/explore')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Create your account</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {[
        { name: 'display_name', placeholder: 'Display name', type: 'text' },
        { name: 'email', placeholder: 'Email', type: 'email' },
        { name: 'password', placeholder: 'Password (min 8 chars)', type: 'password' },
        { name: 'age', placeholder: 'Age (must be 18+)', type: 'number' },
        { name: 'phone', placeholder: 'WhatsApp number (optional)', type: 'tel' },
      ].map(f => (
        <input
          key={f.name}
          type={f.type}
          placeholder={f.placeholder}
          value={form[f.name as keyof typeof form]}
          onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
          required={f.name !== 'phone'}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      ))}
      <button
        type="submit"
        disabled={loading}
        className="bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition"
      >
        {loading ? 'Creating account...' : 'Join ZuriX'}
      </button>
      <p className="text-zinc-500 text-sm text-center">
        Already have an account? <Link href="/login" className="text-amber-500">Sign in</Link>
      </p>
      <p className="text-zinc-600 text-xs text-center">By joining you confirm you are 18+ and agree to our terms.</p>
    </form>
  )
}
```

- [ ] **Step 3: Create app/(auth)/login/page.tsx**
```tsx
// app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }
    router.push('/explore')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Welcome back</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)} required
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
      />
      <input
        type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)} required
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
      />
      <button
        type="submit" disabled={loading}
        className="bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      <p className="text-zinc-500 text-sm text-center">
        New here? <Link href="/register" className="text-amber-500">Create account</Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 4: Verify auth flow**
```bash
pnpm dev
```
- Go to http://localhost:3000/register, create a test account
- Verify redirect to /explore after register
- Sign out via Supabase, verify /login redirects back to /explore on success

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add register and login pages with Supabase auth"
```

---

### Task 9: Explore grid

**Files:**
- Create: `app/(app)/explore/page.tsx`
- Create: `components/explore/ProfileCard.tsx`
- Create: `components/explore/ExploreGrid.tsx`
- Create: `app/api/explore/route.ts`

- [ ] **Step 1: Create app/api/explore/route.ts**
```ts
// app/api/explore/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '0')
  const pageSize = 20
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, age, location_city, avatar_url, is_verified, created_at, tier')
    .eq('hide_data', false)
    .not('avatar_url', 'is', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profiles: data, page, hasMore: data.length === pageSize })
}
```

- [ ] **Step 2: Create components/explore/ProfileCard.tsx**
```tsx
// components/explore/ProfileCard.tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import clsx from 'clsx'

interface Profile {
  id: string
  username: string
  display_name: string
  age: number
  location_city: string
  avatar_url: string
  is_verified: boolean
}

interface Props {
  profile: Profile
  onInterested?: (id: string) => void
}

export default function ProfileCard({ profile, onInterested }: Props) {
  return (
    <div
      className="relative rounded-xl overflow-hidden aspect-[3/4] group cursor-pointer"
      onTouchStart={() => {}}
    >
      <Link href={`/profile/${profile.username}`}>
        <Image
          src={profile.avatar_url}
          alt={profile.display_name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
          unoptimized
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-1">
            <span className="font-bold text-white text-sm">{profile.display_name}</span>
            {profile.is_verified && <span className="text-amber-500 text-xs">✓</span>}
          </div>
          <p className="text-zinc-300 text-xs">{profile.age} · {profile.location_city}</p>
        </div>
      </Link>
      {/* Interested button */}
      <button
        onClick={() => onInterested?.(profile.id)}
        className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition text-sm"
        title="Interested"
      >
        ❤️
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create components/explore/ExploreGrid.tsx**
```tsx
// components/explore/ExploreGrid.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import ProfileCard from './ProfileCard'

interface Profile {
  id: string
  username: string
  display_name: string
  age: number
  location_city: string
  avatar_url: string
  is_verified: boolean
}

export default function ExploreGrid() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  async function loadMore() {
    if (loading || !hasMore) return
    setLoading(true)
    const res = await fetch(`/api/explore?page=${page}`)
    const data = await res.json()
    setProfiles(prev => [...prev, ...data.profiles])
    setHasMore(data.hasMore)
    setPage(prev => prev + 1)
    setLoading(false)
  }

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { threshold: 0.1 })
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [page, hasMore, loading])

  useEffect(() => { loadMore() }, [])

  async function handleInterested(id: string) {
    await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'profile', targetId: id }),
    })
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {profiles.map(p => (
          <ProfileCard key={p.id} profile={p} onInterested={handleInterested} />
        ))}
      </div>
      <div ref={loaderRef} className="py-8 text-center text-zinc-600">
        {loading && <span>Loading more...</span>}
        {!hasMore && profiles.length > 0 && <span>You've seen everyone — come back later!</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create app/(app)/explore/page.tsx**
```tsx
// app/(app)/explore/page.tsx
import ExploreGrid from '@/components/explore/ExploreGrid'

export default function ExplorePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Explore</h1>
        <p className="text-zinc-400 text-sm">Swipe right on a profile to show interest</p>
      </div>
      <ExploreGrid />
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**
```bash
pnpm dev
```
Open http://localhost:3000/explore after logging in.
Expected: Grid of profile photos loads, scrolling loads more, hover shows heart button.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: add explore grid with infinite scroll and profile cards"
```

---

### Task 10: Profile page

**Files:**
- Create: `app/(app)/profile/[username]/page.tsx`
- Create: `app/api/profile/[username]/route.ts`
- Create: `app/api/likes/route.ts`

- [ ] **Step 1: Create app/api/profile/[username]/route.ts**
```ts
// app/api/profile/[username]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: { username: string } }) {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, display_name, age, gender, location_city, bio, avatar_url, interests, looking_for, is_verified, hide_data, created_at, tier')
    .eq('username', params.username)
    .single()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { count: likesCount } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', 'profile')
    .eq('target_id', profile.id)

  const { data: posts } = await supabase
    .from('posts')
    .select('id, media_urls, caption, likes_count, created_at, is_spicy')
    .eq('user_id', profile.id)
    .eq('is_spicy', false)
    .order('created_at', { ascending: false })
    .limit(12)

  return NextResponse.json({ profile, likesCount: likesCount ?? 0, posts: posts ?? [] })
}
```

- [ ] **Step 2: Create app/api/likes/route.ts**
```ts
// app/api/likes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetType, targetId } = await req.json() as { targetType: string; targetId: string }

  const { error } = await supabase.from('likes').upsert({
    user_id: user.id,
    target_type: targetType,
    target_id: targetId,
  })

  if (targetType === 'post') {
    await supabase.rpc('increment_likes', { post_id: targetId })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create the increment_likes function in Supabase**

Run in Supabase SQL Editor:
```sql
create or replace function increment_likes(post_id uuid)
returns void language plpgsql as $$
begin
  update posts set likes_count = likes_count + 1 where id = post_id;
end;
$$;
```

- [ ] **Step 4: Create app/(app)/profile/[username]/page.tsx**
```tsx
// app/(app)/profile/[username]/page.tsx
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

async function getProfile(username: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : 'http://localhost:3000'}/api/profile/${username}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const data = await getProfile(params.username)
  if (!data) notFound()

  const { profile, likesCount, posts } = data
  const memberSince = formatDistanceToNow(new Date(profile.created_at), { addSuffix: false })

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex gap-6 items-start mb-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border-2 border-amber-500">
          {profile.avatar_url && (
            <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" unoptimized />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            {profile.is_verified && <span className="text-amber-500 text-sm">✓</span>}
          </div>
          <p className="text-zinc-400 text-sm">@{profile.username} · {profile.age} yrs · {profile.location_city}</p>
          <p className="text-zinc-500 text-xs mt-1">Member {memberSince}</p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-amber-500 font-bold">❤ {likesCount.toLocaleString()}</span>
            <span className="text-zinc-400">likes</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && <p className="text-zinc-300 mb-4">{profile.bio}</p>}

      {/* Interests */}
      {profile.interests?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {profile.interests.map((i: string) => (
            <span key={i} className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-full">{i}</span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mb-8">
        <button className="flex-1 bg-amber-500 text-black font-bold py-2 rounded-full hover:bg-amber-400 transition">
          Follow
        </button>
        <button className="flex-1 border border-zinc-700 text-white py-2 rounded-full hover:bg-zinc-800 transition">
          Message
        </button>
        <button className="border border-zinc-700 text-white px-4 py-2 rounded-full hover:bg-zinc-800 transition">
          ❤
        </button>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post: { id: string; media_urls: string[]; likes_count: number }) => (
          post.media_urls?.[0] && (
            <div key={post.id} className="relative aspect-square overflow-hidden rounded-sm">
              <Image src={post.media_urls[0]} alt="" fill className="object-cover hover:scale-105 transition-transform" unoptimized />
              {post.likes_count > 0 && (
                <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 rounded px-1">
                  ❤ {post.likes_count}
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Install date-fns**
```bash
pnpm add date-fns
```

- [ ] **Step 6: Verify profile page**
```bash
pnpm dev
```
Open http://localhost:3000/profile/{username} for a seeded user.
Expected: Avatar, name, age, location, member duration, likes counter, photo grid.

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: add profile page with likes counter, account age, and photo grid"
```

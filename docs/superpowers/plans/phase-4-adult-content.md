# ZuriX Phase 4: Adult Content + Age Gate

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Age gate component (cookie-based 18+ wall), eporner.com embed section with category filter.

**Architecture:** Age gate is a client component that checks a cookie; if absent it shows the 18+ confirmation wall. eporner.com videos are admin-curated iframes — no content is downloaded or re-hosted.

**Tech Stack:** Next.js cookies API, Supabase admin_videos table

## Global Constraints
- Age gate required on /adult, /spicy, /live
- No adult content downloaded or re-hosted — iframe embeds only
- Blaze+ required for /adult page
- Admin-only video curation

---

### Task 16: Age gate component

**Files:**
- Create: `components/ui/AgeGate.tsx`
- Test: `tests/components/AgeGate.test.tsx`

- [ ] **Step 1: Create components/ui/AgeGate.tsx**
```tsx
// components/ui/AgeGate.tsx
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

interface Props {
  children: React.ReactNode
}

export default function AgeGate({ children }: Props) {
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    setVerified(getCookie(COOKIE_KEY) === 'yes')
  }, [])

  function confirm() {
    setCookie(COOKIE_KEY, 'yes', 30)
    setVerified(true)
  }

  function deny() {
    window.location.href = '/'
  }

  if (verified === null) return null // avoid flash

  if (!verified) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-6">🔞</div>
        <h1 className="text-3xl font-black text-white mb-3">Adults Only</h1>
        <p className="text-zinc-400 max-w-sm mb-8">
          This section contains adult content intended for viewers aged 18 and over.
          By entering you confirm you are 18 or older.
        </p>
        <div className="flex gap-4">
          <button
            onClick={confirm}
            className="bg-amber-500 text-black font-bold px-8 py-3 rounded-full hover:bg-amber-400 transition text-lg"
          >
            I am 18+, Enter
          </button>
          <button
            onClick={deny}
            className="border border-zinc-700 text-white px-8 py-3 rounded-full hover:bg-zinc-800 transition text-lg"
          >
            Exit
          </button>
        </div>
        <p className="text-zinc-600 text-xs mt-6 max-w-xs">
          By entering you agree to our terms of service. This confirmation is stored in your browser for 30 days.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Write AgeGate tests**
```tsx
// tests/components/AgeGate.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AgeGate from '@/components/ui/AgeGate'

describe('AgeGate', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie = 'zurix_age_verified=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
  })

  it('shows age wall when not verified', async () => {
    render(<AgeGate><p>Adult content</p></AgeGate>)
    // Need to wait for useEffect
    await new Promise(r => setTimeout(r, 10))
    expect(screen.getByText('I am 18+, Enter')).toBeInTheDocument()
    expect(screen.queryByText('Adult content')).not.toBeInTheDocument()
  })

  it('shows children after confirmation', async () => {
    render(<AgeGate><p>Adult content</p></AgeGate>)
    await new Promise(r => setTimeout(r, 10))
    fireEvent.click(screen.getByText('I am 18+, Enter'))
    expect(screen.getByText('Adult content')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests**
```bash
pnpm test
```
Expected: All tests pass

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: add AgeGate component with cookie-based 18+ verification"
```

---

### Task 17: eporner.com adult video section

**Files:**
- Create: `app/(app)/adult/page.tsx`
- Create: `components/adult/VideoGrid.tsx`
- Create: `components/adult/VideoCard.tsx`
- Create: `app/api/adult-videos/route.ts`

- [ ] **Step 1: Create app/api/adult-videos/route.ts**
```ts
// app/api/adult-videos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/tiers'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('tier').eq('id', user.id).single()

  if (!hasAccess((profile?.tier ?? 'free') as any, 'blaze')) {
    return NextResponse.json({ error: 'Blaze tier required' }, { status: 403 })
  }

  const category = req.nextUrl.searchParams.get('category') ?? 'all'
  let query = supabase
    .from('adult_videos')
    .select('id, eporner_id, title, thumbnail_url, category, is_featured')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ videos: data ?? [] })
}

export async function POST(req: NextRequest) {
  // Admin only — add a video
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eporner_id, title, thumbnail_url, category } = await req.json() as {
    eporner_id: string; title: string; thumbnail_url?: string; category?: string
  }

  const { data, error } = await supabase.from('adult_videos').insert({
    eporner_id, title, thumbnail_url, category: category ?? 'General',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ video: data })
}
```

- [ ] **Step 2: Create components/adult/VideoCard.tsx**
```tsx
// components/adult/VideoCard.tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'

interface Video {
  id: string
  eporner_id: string
  title: string
  thumbnail_url: string | null
  category: string
  is_featured: boolean
}

export default function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <div className="rounded-xl overflow-hidden bg-black aspect-video">
        <iframe
          src={`https://www.eporner.com/embed/${video.eporner_id}/`}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          title={video.title}
        />
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer group relative"
      onClick={() => setPlaying(true)}
    >
      <div className="relative aspect-video bg-zinc-800">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-4xl">🎬</div>
        )}
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
          <div className="bg-amber-500 rounded-full w-14 h-14 flex items-center justify-center text-black text-2xl">
            ▶
          </div>
        </div>
        {video.is_featured && (
          <span className="absolute top-2 left-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded">
            Featured
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-sm text-zinc-300 line-clamp-2">{video.title}</p>
        <p className="text-xs text-zinc-500 mt-1">{video.category}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create components/adult/VideoGrid.tsx**
```tsx
// components/adult/VideoGrid.tsx
'use client'
import { useEffect, useState } from 'react'
import VideoCard from './VideoCard'

const CATEGORIES = ['all', 'Kenyan', 'Ebony', 'Amateur', 'General']

interface Video {
  id: string
  eporner_id: string
  title: string
  thumbnail_url: string | null
  category: string
  is_featured: boolean
}

export default function VideoGrid() {
  const [videos, setVideos] = useState<Video[]>([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/adult-videos?category=${category}`)
      .then(r => r.json())
      .then(d => { setVideos(d.videos ?? []); setLoading(false) })
  }, [category])

  return (
    <div>
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium flex-shrink-0 transition ${
              category === c
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      {loading && <div className="text-zinc-500 text-center py-8">Loading videos...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map(v => <VideoCard key={v.id} video={v} />)}
      </div>

      {!loading && videos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500">No videos in this category yet.</p>
          <p className="text-zinc-600 text-sm mt-1">Check back soon — admin is adding more.</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create app/(app)/adult/page.tsx**
```tsx
// app/(app)/adult/page.tsx
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/tiers'
import TierGate from '@/components/ui/TierGate'
import AgeGate from '@/components/ui/AgeGate'
import VideoGrid from '@/components/adult/VideoGrid'

export default async function AdultPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users').select('tier').eq('id', user!.id).single()
  const tier = (profile?.tier ?? 'free') as any

  return (
    <AgeGate>
      <TierGate userTier={tier} required="blaze">
        <div>
          <h1 className="text-2xl font-bold mb-1">Adult Videos</h1>
          <p className="text-zinc-500 text-sm mb-6">Curated content. 18+ only.</p>
          <VideoGrid />
        </div>
      </TierGate>
    </AgeGate>
  )
}
```

- [ ] **Step 5: Seed a few test videos via Supabase SQL Editor**
```sql
insert into adult_videos (eporner_id, title, thumbnail_url, category, is_featured) values
('aBcDeFgHiJk', 'Sample Video 1', null, 'General', true),
('xYzAbCdEfGh', 'Sample Video 2', null, 'Amateur', false);
```
Replace `eporner_id` values with real IDs from eporner.com video URLs (format: `eporner.com/video/{id}/`).

- [ ] **Step 6: Verify adult section**
```bash
pnpm dev
```
Log in as a Blaze+ user (update tier in Supabase), go to /adult.
Expected: Age gate appears first, then video grid with category filter.

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: add adult video section with eporner embeds and age/tier gate"
```

# ZuriX Phase 3: Social Features (Posts, Stories, Follow, Chat)

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Posts feed, story creation/viewer, follow system, spicy content feed, and DM chat.

**Architecture:** Posts and stories stored in Supabase, media in R2. Chat uses Supabase Realtime for live updates.

**Tech Stack:** Supabase Realtime, R2 presigned uploads, date-fns

## Global Constraints
- Spicy posts gate: Blaze+ only
- Stories auto-expire at 24h (enforced by RLS policy on stories table)
- Chat: Flame+ only
- All uploads go through presigned R2 URL via /api/upload

---

### Task 11: Follow system + follow API

**Files:**
- Create: `app/api/follow/route.ts`
- Modify: `app/(app)/profile/[username]/page.tsx` (wire Follow button)

- [ ] **Step 1: Create app/api/follow/route.ts**
```ts
// app/api/follow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { followingId, action } = await req.json() as { followingId: string; action: 'follow' | 'unfollow' }

  if (action === 'follow') {
    const { error } = await supabase.from('follows').upsert({
      follower_id: user.id,
      following_id: followingId,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ isFollowing: false })

  const followingId = req.nextUrl.searchParams.get('followingId')
  if (!followingId) return NextResponse.json({ error: 'followingId required' }, { status: 400 })

  const { data } = await supabase.from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .single()

  return NextResponse.json({ isFollowing: !!data })
}
```

- [ ] **Step 2: Create components/profile/FollowButton.tsx**
```tsx
// components/profile/FollowButton.tsx
'use client'
import { useState, useEffect } from 'react'

interface Props {
  profileId: string
}

export default function FollowButton({ profileId }: Props) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/follow?followingId=${profileId}`)
      .then(r => r.json())
      .then(d => setIsFollowing(d.isFollowing))
  }, [profileId])

  async function toggle() {
    setLoading(true)
    const action = isFollowing ? 'unfollow' : 'follow'
    await fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followingId: profileId, action }),
    })
    setIsFollowing(prev => !prev)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex-1 font-bold py-2 rounded-full transition ${
        isFollowing
          ? 'border border-zinc-700 text-white hover:bg-zinc-800'
          : 'bg-amber-500 text-black hover:bg-amber-400'
      }`}
    >
      {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
```

- [ ] **Step 3: Wire FollowButton into profile page**

In `app/(app)/profile/[username]/page.tsx`, replace the static Follow button:
```tsx
// Add import at top:
import FollowButton from '@/components/profile/FollowButton'

// Replace the static <button> for Follow with:
<FollowButton profileId={profile.id} />
```

- [ ] **Step 4: Verify follow toggle**
Open two different profiles, click Follow/Unfollow, verify state persists on refresh.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add follow/unfollow system with follow button"
```

---

### Task 12: Posts (create + feed)

**Files:**
- Create: `app/(app)/posts/page.tsx`
- Create: `components/posts/PostCard.tsx`
- Create: `components/posts/CreatePost.tsx`
- Create: `app/api/posts/route.ts`

- [ ] **Step 1: Create app/api/posts/route.ts**
```ts
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const feed = req.nextUrl.searchParams.get('feed') === 'following'

  let query = supabase
    .from('posts')
    .select(`
      id, caption, media_urls, is_spicy, likes_count, created_at,
      users!user_id (id, username, display_name, avatar_url, is_verified)
    `)
    .eq('is_spicy', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (feed) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    const ids = (follows ?? []).map(f => f.following_id)
    if (ids.length === 0) return NextResponse.json({ posts: [] })
    query = query.in('user_id', ids)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { caption, mediaUrls, isSpicy } = await req.json() as {
    caption: string; mediaUrls: string[]; isSpicy: boolean
  }

  const { data, error } = await supabase.from('posts').insert({
    user_id: user.id,
    caption,
    media_urls: mediaUrls,
    is_spicy: isSpicy ?? false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
```

- [ ] **Step 2: Create components/posts/PostCard.tsx**
```tsx
// components/posts/PostCard.tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

interface Post {
  id: string
  caption: string
  media_urls: string[]
  likes_count: number
  created_at: string
  users: { id: string; username: string; display_name: string; avatar_url: string; is_verified: boolean }
}

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count)

  async function handleLike() {
    if (liked) return
    setLiked(true)
    setLikesCount(prev => prev + 1)
    await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'post', targetId: post.id }),
    })
  }

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
      {/* Author row */}
      <div className="flex items-center gap-3 p-3">
        <Link href={`/profile/${post.users.username}`}>
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-zinc-700">
            {post.users.avatar_url && (
              <Image src={post.users.avatar_url} alt="" fill className="object-cover" unoptimized />
            )}
          </div>
        </Link>
        <div>
          <Link href={`/profile/${post.users.username}`} className="font-semibold text-sm hover:text-amber-500">
            {post.users.display_name}
          </Link>
          {post.users.is_verified && <span className="text-amber-500 text-xs ml-1">✓</span>}
        </div>
      </div>

      {/* Media */}
      {post.media_urls?.[0] && (
        <div className="relative aspect-square">
          <Image src={post.media_urls[0]} alt={post.caption} fill className="object-cover" unoptimized />
        </div>
      )}

      {/* Actions */}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLike}
            className={`text-xl transition ${liked ? 'text-red-500 scale-110' : 'text-zinc-400 hover:text-red-400'}`}
          >
            ❤
          </button>
          <span className="text-sm text-zinc-400">{likesCount} likes</span>
        </div>
        {post.caption && <p className="text-sm text-zinc-300">{post.caption}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create components/posts/CreatePost.tsx**
```tsx
// components/posts/CreatePost.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatePost() {
  const router = useRouter()
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isSpicy, setIsSpicy] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)

    // Get presigned URL
    const { uploadUrl, key } = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    }).then(r => r.json())

    // Upload to R2
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`

    // Create post
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption, mediaUrls: [publicUrl], isSpicy }),
    })

    setCaption('')
    setFile(null)
    setPreview(null)
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-6 flex flex-col gap-3">
      <h3 className="font-bold text-sm text-zinc-300">New Post</h3>
      <input type="file" accept="image/*,video/*" onChange={handleFile} className="text-sm text-zinc-400" />
      {preview && (
        <img src={preview} alt="preview" className="rounded-lg max-h-48 object-cover" />
      )}
      <textarea
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder="Write a caption..."
        rows={2}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-amber-500"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
        <input type="checkbox" checked={isSpicy} onChange={e => setIsSpicy(e.target.checked)} className="accent-amber-500" />
        Mark as spicy content (Blaze+ viewers only)
      </label>
      <button
        type="submit" disabled={loading || !file}
        className="bg-amber-500 text-black font-bold py-2 rounded-full hover:bg-amber-400 disabled:opacity-50 transition text-sm"
      >
        {loading ? 'Posting...' : 'Post'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Add NEXT_PUBLIC_R2_PUBLIC_URL to .env.local**
```
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-XXXX.r2.dev
```

- [ ] **Step 5: Create app/(app)/posts/page.tsx**
```tsx
// app/(app)/posts/page.tsx
'use client'
import { useEffect, useState } from 'react'
import PostCard from '@/components/posts/PostCard'
import CreatePost from '@/components/posts/CreatePost'

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/posts?feed=following')
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []))
  }, [])

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Feed</h1>
      <CreatePost />
      <div className="flex flex-col gap-4">
        {posts.length === 0 && (
          <p className="text-zinc-500 text-center py-8">Follow people to see their posts here.</p>
        )}
        {posts.map(p => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify posts flow**
Log in, go to /posts, create a post with a photo, verify it appears in feed.

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: add posts feed, post creation, and like system"
```

---

### Task 13: Stories

**Files:**
- Create: `app/(app)/stories/page.tsx`
- Create: `components/stories/StoriesRow.tsx`
- Create: `components/stories/StoryViewer.tsx`
- Create: `app/api/stories/route.ts`

- [ ] **Step 1: Create app/api/stories/route.ts**
```ts
// app/api/stories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const ids = [(follows ?? []).map(f => f.following_id), user.id].flat()

  const { data } = await supabase
    .from('stories')
    .select('id, media_url, expires_at, created_at, user_id, users!user_id(username, display_name, avatar_url)')
    .in('user_id', ids)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({ stories: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mediaUrl } = await req.json() as { mediaUrl: string }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase.from('stories').insert({
    user_id: user.id,
    media_url: mediaUrl,
    expires_at: expiresAt,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ story: data })
}
```

- [ ] **Step 2: Create components/stories/StoriesRow.tsx**
```tsx
// components/stories/StoriesRow.tsx
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Story {
  id: string
  media_url: string
  users: { username: string; display_name: string; avatar_url: string }
}

interface Props {
  onSelect: (stories: Story[], startIndex: number) => void
}

export default function StoriesRow({ onSelect }: Props) {
  const [stories, setStories] = useState<Story[]>([])

  useEffect(() => {
    fetch('/api/stories').then(r => r.json()).then(d => setStories(d.stories ?? []))
  }, [])

  // Group by user
  const byUser = stories.reduce<Record<string, Story[]>>((acc, s) => {
    const key = s.users.username
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const users = Object.values(byUser)
  if (users.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-hide">
      {users.map((userStories, i) => {
        const u = userStories[0].users
        return (
          <button
            key={u.username}
            onClick={() => onSelect(userStories, 0)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative w-14 h-14 rounded-full border-2 border-amber-500 overflow-hidden">
              {u.avatar_url && (
                <Image src={u.avatar_url} alt={u.display_name} fill className="object-cover" unoptimized />
              )}
            </div>
            <span className="text-xs text-zinc-400 truncate w-14 text-center">{u.display_name}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create components/stories/StoryViewer.tsx**
```tsx
// components/stories/StoryViewer.tsx
'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'

interface Story {
  id: string
  media_url: string
  users: { username: string; display_name: string; avatar_url: string }
}

interface Props {
  stories: Story[]
  startIndex: number
  onClose: () => void
}

export default function StoryViewer({ stories, startIndex, onClose }: Props) {
  const [current, setCurrent] = useState(startIndex)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (current < stories.length - 1) {
            setCurrent(c => c + 1)
            return 0
          } else {
            onClose()
            return 100
          }
        }
        return prev + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [current])

  const story = stories[current]
  const u = story.users

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onClick={e => {
        const half = window.innerWidth / 2
        if (e.clientX < half) {
          if (current > 0) { setCurrent(c => c - 1); setProgress(0) } else onClose()
        } else {
          if (current < stories.length - 1) { setCurrent(c => c + 1); setProgress(0) } else onClose()
        }
      }}
    >
      {/* Progress bars */}
      <div className="flex gap-1 p-2">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < current ? '100%' : i === current ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/30">
          {u.avatar_url && <Image src={u.avatar_url} alt="" fill className="object-cover" unoptimized />}
        </div>
        <span className="text-white text-sm font-medium">{u.display_name}</span>
        <button onClick={e => { e.stopPropagation(); onClose() }} className="ml-auto text-white text-xl">✕</button>
      </div>

      {/* Story media */}
      <div className="flex-1 relative">
        <Image src={story.media_url} alt="" fill className="object-contain" unoptimized />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create app/(app)/stories/page.tsx**
```tsx
// app/(app)/stories/page.tsx
'use client'
import { useState } from 'react'
import StoriesRow from '@/components/stories/StoriesRow'
import StoryViewer from '@/components/stories/StoryViewer'

interface Story {
  id: string
  media_url: string
  users: { username: string; display_name: string; avatar_url: string }
}

export default function StoriesPage() {
  const [activeStories, setActiveStories] = useState<Story[] | null>(null)
  const [startIndex, setStartIndex] = useState(0)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Stories</h1>
      <StoriesRow onSelect={(stories, i) => { setActiveStories(stories); setStartIndex(i) }} />
      <p className="text-zinc-500 text-sm text-center mt-8">
        Stories disappear after 24 hours. Follow people to see their stories.
      </p>
      {activeStories && (
        <StoryViewer
          stories={activeStories}
          startIndex={startIndex}
          onClose={() => setActiveStories(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verify stories**
```bash
pnpm dev
```
Post a story via Supabase table editor (insert a row), go to /stories, verify avatar ring appears, click to open viewer.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: add stories row, viewer with progress bar, and stories API"
```

---

### Task 14: Spicy content feed (Blaze+ gate)

**Files:**
- Create: `app/(app)/spicy/page.tsx`
- Create: `app/api/posts/spicy/route.ts`

- [ ] **Step 1: Create app/api/posts/spicy/route.ts**
```ts
// app/api/posts/spicy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/tiers'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (!hasAccess((profile?.tier ?? 'free') as any, 'blaze')) {
    return NextResponse.json({ error: 'Blaze tier required' }, { status: 403 })
  }

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '0')
  const { data } = await supabase
    .from('posts')
    .select('id, caption, media_urls, likes_count, created_at, users!user_id(id, username, display_name, avatar_url)')
    .eq('is_spicy', true)
    .order('created_at', { ascending: false })
    .range(page * 12, page * 12 + 11)

  return NextResponse.json({ posts: data ?? [] })
}
```

- [ ] **Step 2: Create app/(app)/spicy/page.tsx**
```tsx
// app/(app)/spicy/page.tsx
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/tiers'
import TierGate from '@/components/ui/TierGate'
import SpicyFeed from '@/components/posts/SpicyFeed'
import AgeGate from '@/components/ui/AgeGate'

export default async function SpicyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users').select('tier').eq('id', user!.id).single()
  const tier = (profile?.tier ?? 'free') as any

  return (
    <AgeGate>
      <TierGate userTier={tier} required="blaze">
        <div>
          <h1 className="text-2xl font-bold mb-2">Spicy Content</h1>
          <p className="text-zinc-500 text-sm mb-6">User-posted exclusive content. 18+ only.</p>
          <SpicyFeed />
        </div>
      </TierGate>
    </AgeGate>
  )
}
```

- [ ] **Step 3: Create components/posts/SpicyFeed.tsx**
```tsx
// components/posts/SpicyFeed.tsx
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Post {
  id: string
  caption: string
  media_urls: string[]
  likes_count: number
  users: { username: string; display_name: string; avatar_url: string }
}

export default function SpicyFeed() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    fetch('/api/posts/spicy').then(r => r.json()).then(d => setPosts(d.posts ?? []))
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {posts.map(p => (
        <div key={p.id} className="relative rounded-xl overflow-hidden aspect-square group">
          {p.media_urls?.[0] && (
            <Image src={p.media_urls[0]} alt="" fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <Link href={`/profile/${p.users.username}`} className="text-xs font-bold text-white hover:text-amber-500">
              {p.users.display_name}
            </Link>
            {p.caption && <p className="text-xs text-zinc-300 truncate">{p.caption}</p>}
            <span className="text-xs text-zinc-400">❤ {p.likes_count}</span>
          </div>
        </div>
      ))}
      {posts.length === 0 && (
        <p className="col-span-3 text-zinc-500 text-center py-8">No spicy posts yet. Be the first!</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: add spicy content feed with Blaze+ gate"
```

---

### Task 15: DM Chat (Flame+)

**Files:**
- Create: `app/(app)/chat/page.tsx`
- Create: `app/(app)/chat/[userId]/page.tsx`
- Create: `components/chat/MessageThread.tsx`
- Create: `app/api/messages/route.ts`

- [ ] **Step 1: Create app/api/messages/route.ts**
```ts
// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recipientId = req.nextUrl.searchParams.get('with')
  if (!recipientId) {
    // Return inbox (last message per conversation)
    const { data } = await supabase
      .from('messages')
      .select('id, body, created_at, read_at, sender_id, recipient_id, users!sender_id(display_name, avatar_url, username)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ messages: data ?? [] })
  }

  const { data } = await supabase
    .from('messages')
    .select('id, body, created_at, read_at, sender_id, recipient_id')
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
    .order('created_at', { ascending: true })
    .limit(100)

  // Mark received messages as read
  await supabase.from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', recipientId)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipientId, body } = await req.json() as { recipientId: string; body: string }
  if (!body?.trim()) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })

  const { data, error } = await supabase.from('messages').insert({
    sender_id: user.id,
    recipient_id: recipientId,
    body: body.trim(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}
```

- [ ] **Step 2: Create components/chat/MessageThread.tsx**
```tsx
// components/chat/MessageThread.tsx
'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  body: string
  sender_id: string
  created_at: string
  read_at: string | null
}

interface Props {
  recipientId: string
  currentUserId: string
}

export default function MessageThread({ recipientId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/messages?with=${recipientId}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []))
  }, [recipientId])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${recipientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${currentUserId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [recipientId, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    const { message } = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId, body: input }),
    }).then(r => r.json())
    setMessages(prev => [...prev, message])
    setInput('')
    setSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 py-4">
        {messages.map(m => (
          <div
            key={m.id}
            className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
              m.sender_id === currentUserId
                ? 'bg-amber-500 text-black self-end'
                : 'bg-zinc-800 text-white self-start'
            }`}
          >
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-zinc-800 pt-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit" disabled={sending || !input.trim()}
          className="bg-amber-500 text-black font-bold px-5 py-2 rounded-full hover:bg-amber-400 disabled:opacity-50 text-sm transition"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create app/(app)/chat/page.tsx**
```tsx
// app/(app)/chat/page.tsx
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/tiers'
import TierGate from '@/components/ui/TierGate'
import Link from 'next/link'
import Image from 'next/image'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('tier').eq('id', user!.id).single()
  const tier = (profile?.tier ?? 'free') as any

  const { data: messages } = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id, recipient_id, users!sender_id(id, username, display_name, avatar_url)')
    .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  // Deduplicate by conversation partner
  const seen = new Set<string>()
  const conversations = (messages ?? []).filter(m => {
    const partnerId = m.sender_id === user!.id ? m.recipient_id : m.sender_id
    if (seen.has(partnerId)) return false
    seen.add(partnerId)
    return true
  })

  return (
    <TierGate userTier={tier} required="flame">
      <div>
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <div className="flex flex-col gap-1">
          {conversations.map(m => {
            const u = m.users
            const partnerId = m.sender_id === user!.id ? m.recipient_id : m.sender_id
            return (
              <Link
                key={m.id}
                href={`/chat/${partnerId}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition"
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {u?.avatar_url && <Image src={u.avatar_url} alt="" fill className="object-cover" unoptimized />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{u?.display_name}</p>
                  <p className="text-zinc-500 text-xs truncate">{m.body}</p>
                </div>
              </Link>
            )
          })}
          {conversations.length === 0 && (
            <p className="text-zinc-500 text-center py-8">No messages yet. Start a conversation from someone's profile.</p>
          )}
        </div>
      </div>
    </TierGate>
  )
}
```

- [ ] **Step 4: Create app/(app)/chat/[userId]/page.tsx**
```tsx
// app/(app)/chat/[userId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MessageThread from '@/components/chat/MessageThread'

export default async function ChatThreadPage({ params }: { params: { userId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: recipient } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url')
    .eq('id', params.userId)
    .single()

  if (!recipient) notFound()

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-4">
        <h2 className="font-bold">{recipient.display_name}</h2>
        <span className="text-zinc-500 text-sm">@{recipient.username}</span>
      </div>
      <MessageThread recipientId={params.userId} currentUserId={user.id} />
    </div>
  )
}
```

- [ ] **Step 5: Enable Supabase Realtime on messages table**

In Supabase Dashboard → Database → Replication → enable `messages` table for realtime.

- [ ] **Step 6: Verify chat**
```bash
pnpm dev
```
Open two browser windows logged in as different users. Send a message in one, verify it appears in real-time in the other.

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: add DM chat with Supabase Realtime and Flame+ gate"
```

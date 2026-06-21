# ZuriX Phase 5: Live Streaming

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** nginx-rtmp live streaming server on boss-server, go-live dashboard with stream key, HLS viewer, and Chaturbate featured rooms.

**Architecture:** Streamers push RTMP to boss-server → nginx-rtmp transcodes to HLS → viewers watch via HLS.js. Chaturbate rooms are fetched from Chaturbate's public affiliates API and displayed alongside.

**Tech Stack:** nginx + nginx-rtmp-module, HLS.js, Chaturbate affiliates API

## Global Constraints
- Live streaming: Inferno tier only
- nginx-rtmp runs on boss-server port 1935
- HLS segments at /tmp/hls on boss-server
- AgeGate required on /live

---

### Task 18: nginx-rtmp server setup on boss-server

**Files:**
- Create: `server/nginx-rtmp.conf` (reference config, deploy manually)
- Create: `app/api/stream/auth/route.ts`
- Create: `app/api/stream/end/route.ts`

- [ ] **Step 1: SSH into boss-server and install nginx with RTMP module**
```bash
ssh boss-server
apt update
apt install -y libnginx-mod-rtmp nginx
```
Expected: nginx installed with rtmp module

- [ ] **Step 2: Create HLS output directory on boss-server**
```bash
mkdir -p /tmp/hls
chmod 777 /tmp/hls
```

- [ ] **Step 3: Create server/nginx-rtmp.conf in the repo (documentation)**
```nginx
# server/nginx-rtmp.conf
# Deploy this to /etc/nginx/nginx.conf on boss-server

worker_processes auto;
events { worker_connections 1024; }

# RTMP block — live streaming ingest
rtmp {
  server {
    listen 1935;
    chunk_size 4096;

    application live {
      live on;
      record off;

      # Transcode to HLS
      hls on;
      hls_path /tmp/hls;
      hls_fragment 2s;
      hls_playlist_length 10s;

      # Auth callbacks to Next.js app
      on_publish http://localhost:3000/api/stream/auth;
      on_publish_done http://localhost:3000/api/stream/end;
    }
  }
}

http {
  include mime.types;
  default_type application/octet-stream;
  sendfile on;
  keepalive_timeout 65;

  server {
    listen 80;
    server_name zurix.co.ke;

    # Proxy Next.js
    location / {
      proxy_pass http://localhost:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }

    # Serve HLS segments
    location /hls {
      alias /tmp/hls;
      add_header Cache-Control no-cache;
      add_header Access-Control-Allow-Origin *;
      types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
      }
    }
  }
}
```

- [ ] **Step 4: Deploy nginx config on boss-server**
```bash
# On boss-server:
cp /path/to/nginx-rtmp.conf /etc/nginx/nginx.conf
nginx -t
systemctl reload nginx
```
Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

- [ ] **Step 5: Open port 1935 on boss-server firewall**
```bash
ufw allow 1935/tcp
ufw reload
```

- [ ] **Step 6: Create app/api/stream/auth/route.ts**
```ts
// app/api/stream/auth/route.ts
// nginx-rtmp calls this on_publish to validate stream keys
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Uses direct supabase client (nginx won't have cookies)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const streamKey = formData.get('name') as string

  if (!streamKey) return new NextResponse('Forbidden', { status: 403 })

  const { data: stream } = await supabase
    .from('streams')
    .select('id, user_id')
    .eq('stream_key', streamKey)
    .single()

  if (!stream) return new NextResponse('Forbidden', { status: 403 })

  // Mark stream as live
  const domain = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  await supabase.from('streams').update({
    is_live: true,
    started_at: new Date().toISOString(),
    hls_url: `${domain}/hls/${streamKey}.m3u8`,
  }).eq('id', stream.id)

  return new NextResponse('OK', { status: 200 })
}
```

- [ ] **Step 7: Create app/api/stream/end/route.ts**
```ts
// app/api/stream/end/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const streamKey = formData.get('name') as string

  if (!streamKey) return new NextResponse('OK', { status: 200 })

  await supabase.from('streams').update({
    is_live: false,
    viewer_count: 0,
  }).eq('stream_key', streamKey)

  return new NextResponse('OK', { status: 200 })
}
```

- [ ] **Step 8: Add NEXT_PUBLIC_SITE_URL to .env.local**
```
NEXT_PUBLIC_SITE_URL=https://zurix.co.ke
```

- [ ] **Step 9: Commit**
```bash
git add -A && git commit -m "feat: add nginx-rtmp config and stream auth/end webhooks"
```

---

### Task 19: Go-live dashboard

**Files:**
- Create: `app/(app)/go-live/page.tsx`
- Create: `app/api/stream/create/route.ts`
- Create: `components/live/GoLiveDashboard.tsx`

- [ ] **Step 1: Create app/api/stream/create/route.ts**
```ts
// app/api/stream/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/tiers'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('tier').eq('id', user.id).single()

  if (!hasAccess((profile?.tier ?? 'free') as any, 'inferno')) {
    return NextResponse.json({ error: 'Inferno tier required' }, { status: 403 })
  }

  const { title } = await req.json() as { title: string }

  // Upsert stream record (one per user)
  const streamKey = randomBytes(16).toString('hex')
  const { data, error } = await supabase.from('streams').upsert({
    user_id: user.id,
    title: title || 'Live Stream',
    stream_key: streamKey,
    is_live: false,
  }, { onConflict: 'user_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stream: data })
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('streams').select('*').eq('user_id', user.id).single()

  return NextResponse.json({ stream: data ?? null })
}
```

- [ ] **Step 2: Create components/live/GoLiveDashboard.tsx**
```tsx
// components/live/GoLiveDashboard.tsx
'use client'
import { useState, useEffect } from 'react'

interface Stream {
  id: string
  stream_key: string
  title: string
  is_live: boolean
  hls_url: string | null
}

const RTMP_SERVER = process.env.NEXT_PUBLIC_SITE_URL?.replace('https://', 'rtmp://').replace('http://', 'rtmp://') ?? 'rtmp://zurix.co.ke'

export default function GoLiveDashboard() {
  const [stream, setStream] = useState<Stream | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/stream/create').then(r => r.json()).then(d => {
      if (d.stream) setStream(d.stream)
    })
  }, [])

  async function createStream() {
    setLoading(true)
    const { stream } = await fetch('/api/stream/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then(r => r.json())
    setStream(stream)
    setLoading(false)
  }

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-xl">
      {!stream ? (
        <div className="flex flex-col gap-4">
          <p className="text-zinc-400">Set up your live stream and go live from OBS or Larix Broadcaster.</p>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Stream title..."
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={createStream}
            disabled={loading}
            className="bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition"
          >
            {loading ? 'Setting up...' : 'Get Stream Key'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className={`flex items-center gap-2 mb-2 ${stream.is_live ? 'text-red-500' : 'text-zinc-500'}`}>
            <div className={`w-2 h-2 rounded-full ${stream.is_live ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="font-bold text-sm">{stream.is_live ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col gap-3">
            <h3 className="font-bold text-sm text-zinc-300">OBS / Streaming App Settings</h3>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">RTMP Server URL</label>
              <div className="flex gap-2">
                <code className="flex-1 bg-zinc-800 px-3 py-2 rounded text-xs text-amber-400 truncate">
                  {RTMP_SERVER}/live
                </code>
                <button onClick={() => copy(`${RTMP_SERVER}/live`, 'url')}
                  className="text-xs bg-zinc-700 px-3 py-2 rounded hover:bg-zinc-600 transition">
                  {copied === 'url' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Stream Key</label>
              <div className="flex gap-2">
                <code className="flex-1 bg-zinc-800 px-3 py-2 rounded text-xs text-amber-400 truncate">
                  {stream.stream_key}
                </code>
                <button onClick={() => copy(stream.stream_key, 'key')}
                  className="text-xs bg-zinc-700 px-3 py-2 rounded hover:bg-zinc-600 transition">
                  {copied === 'key' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h3 className="font-bold text-sm text-zinc-300 mb-2">How to go live</h3>
            <ol className="text-sm text-zinc-400 flex flex-col gap-1 list-decimal list-inside">
              <li>Download OBS Studio (free) or Larix Broadcaster (mobile)</li>
              <li>Go to Settings → Stream → Custom RTMP</li>
              <li>Paste the Server URL and Stream Key above</li>
              <li>Click Start Streaming</li>
              <li>Your stream will appear live on ZuriX automatically</li>
            </ol>
          </div>

          {stream.is_live && stream.hls_url && (
            <a
              href="/live"
              className="bg-red-600 text-white font-bold py-3 rounded-full text-center hover:bg-red-500 transition"
            >
              Watch your live stream →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create app/(app)/go-live/page.tsx**
```tsx
// app/(app)/go-live/page.tsx
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/tiers'
import TierGate from '@/components/ui/TierGate'
import GoLiveDashboard from '@/components/live/GoLiveDashboard'

export default async function GoLivePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users').select('tier').eq('id', user!.id).single()
  const tier = (profile?.tier ?? 'free') as any

  return (
    <TierGate userTier={tier} required="inferno">
      <div>
        <h1 className="text-2xl font-bold mb-2">Go Live</h1>
        <p className="text-zinc-500 text-sm mb-6">Stream to your ZuriX audience from OBS or your phone.</p>
        <GoLiveDashboard />
      </div>
    </TierGate>
  )
}
```

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: add go-live dashboard with RTMP credentials and setup guide"
```

---

### Task 20: Live stream viewer + Chaturbate rooms

**Files:**
- Create: `app/(app)/live/page.tsx`
- Create: `components/live/HLSPlayer.tsx`
- Create: `components/live/LiveStreamsGrid.tsx`
- Create: `components/live/ChaturbateSection.tsx`
- Create: `app/api/streams/route.ts`
- Create: `app/api/chaturbate/route.ts`

- [ ] **Step 1: Install hls.js**
```bash
pnpm add hls.js
pnpm add -D @types/hls.js
```

- [ ] **Step 2: Create components/live/HLSPlayer.tsx**
```tsx
// components/live/HLSPlayer.tsx
'use client'
import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

interface Props {
  src: string
  autoPlay?: boolean
}

export default function HLSPlayer({ src, autoPlay = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      if (autoPlay) hls.on(Hls.Events.MANIFEST_PARSED, () => video.play())
      return () => hls.destroy()
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src
      if (autoPlay) video.play()
    }
  }, [src, autoPlay])

  return (
    <video
      ref={videoRef}
      controls
      className="w-full rounded-xl aspect-video bg-black"
      playsInline
    />
  )
}
```

- [ ] **Step 3: Create app/api/streams/route.ts**
```ts
// app/api/streams/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data } = await supabase
    .from('streams')
    .select('id, title, hls_url, viewer_count, started_at, users!user_id(display_name, avatar_url, username)')
    .eq('is_live', true)
    .order('viewer_count', { ascending: false })

  return NextResponse.json({ streams: data ?? [] })
}
```

- [ ] **Step 4: Create app/api/chaturbate/route.ts**
```ts
// app/api/chaturbate/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  // First get admin-curated room slugs
  const { data: rooms } = await supabase
    .from('chaturbate_rooms')
    .select('room_slug, display_name, thumbnail_url')
    .eq('is_featured', true)
    .limit(12)

  // Try Chaturbate affiliates API if affiliate ID is set
  const affiliateId = process.env.CHATURBATE_AFFILIATE_ID
  if (affiliateId) {
    try {
      const res = await fetch(
        `https://chaturbate.com/api/public/affiliates/onlinerooms/?wm=${affiliateId}&limit=12&format=json`,
        { next: { revalidate: 60 } }
      )
      if (res.ok) {
        const cb = await res.json()
        return NextResponse.json({
          rooms: (cb.results ?? []).map((r: any) => ({
            room_slug: r.username,
            display_name: r.display_name || r.username,
            thumbnail_url: r.image_url_360x270,
            viewer_count: r.num_users,
            embed_url: `https://chaturbate.com/embed/${r.username}/?join_overlay=1&campaign=${affiliateId}`,
          }))
        })
      }
    } catch {}
  }

  // Fallback: return curated rooms with embed URLs
  return NextResponse.json({
    rooms: (rooms ?? []).map(r => ({
      ...r,
      embed_url: `https://chaturbate.com/embed/${r.room_slug}/?join_overlay=1`,
    }))
  })
}
```

- [ ] **Step 5: Create components/live/ChaturbateSection.tsx**
```tsx
// components/live/ChaturbateSection.tsx
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Room {
  room_slug: string
  display_name: string
  thumbnail_url: string | null
  viewer_count?: number
  embed_url: string
}

export default function ChaturbateSection() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)

  useEffect(() => {
    fetch('/api/chaturbate').then(r => r.json()).then(d => setRooms(d.rooms ?? []))
  }, [])

  if (rooms.length === 0) return null

  return (
    <div className="mt-10">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="text-red-500">🔴</span> Featured on Chaturbate
      </h2>

      {activeRoom && (
        <div className="mb-4 rounded-xl overflow-hidden">
          <iframe
            src={activeRoom.embed_url}
            width="100%"
            height="480"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
            title={activeRoom.display_name}
          />
          <button
            onClick={() => setActiveRoom(null)}
            className="mt-2 text-sm text-zinc-500 hover:text-white"
          >
            Close
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {rooms.map(r => (
          <div
            key={r.room_slug}
            onClick={() => setActiveRoom(r)}
            className="rounded-xl overflow-hidden cursor-pointer group border border-zinc-800 hover:border-amber-500 transition"
          >
            <div className="relative aspect-video bg-zinc-800">
              {r.thumbnail_url && (
                <Image src={r.thumbnail_url} alt={r.display_name} fill className="object-cover" unoptimized />
              )}
              {!r.thumbnail_url && (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-3xl">📹</div>
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition" />
            </div>
            <div className="p-2">
              <p className="text-sm font-medium truncate">{r.display_name}</p>
              {r.viewer_count && <p className="text-xs text-zinc-500">{r.viewer_count} viewers</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create components/live/LiveStreamsGrid.tsx**
```tsx
// components/live/LiveStreamsGrid.tsx
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import HLSPlayer from './HLSPlayer'

interface Stream {
  id: string
  title: string
  hls_url: string
  viewer_count: number
  users: { display_name: string; avatar_url: string; username: string }
}

export default function LiveStreamsGrid() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [active, setActive] = useState<Stream | null>(null)

  useEffect(() => {
    fetch('/api/streams').then(r => r.json()).then(d => setStreams(d.streams ?? []))
    const interval = setInterval(() => {
      fetch('/api/streams').then(r => r.json()).then(d => setStreams(d.streams ?? []))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  if (streams.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <p className="text-4xl mb-3">📡</p>
        <p>No one is live right now.</p>
        <p className="text-sm mt-1">Be the first — <a href="/go-live" className="text-amber-500">go live</a>!</p>
      </div>
    )
  }

  return (
    <div>
      {active && (
        <div className="mb-6">
          <HLSPlayer src={active.hls_url} />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-red-500 font-bold text-sm">LIVE</span>
            <span className="font-bold">{active.users.display_name}</span>
            <span className="text-zinc-500 text-sm">— {active.title}</span>
            <button onClick={() => setActive(null)} className="ml-auto text-zinc-500 hover:text-white text-sm">✕ Close</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {streams.map(s => (
          <div
            key={s.id}
            onClick={() => setActive(s)}
            className="bg-zinc-900 rounded-xl border border-zinc-800 hover:border-amber-500 transition cursor-pointer overflow-hidden"
          >
            <div className="relative aspect-video bg-zinc-800 flex items-center justify-center">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500">
                {s.users.avatar_url && (
                  <Image src={s.users.avatar_url} alt="" fill className="object-cover" unoptimized />
                )}
              </div>
              <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                {s.viewer_count} watching
              </div>
            </div>
            <div className="p-3">
              <p className="font-bold text-sm">{s.users.display_name}</p>
              <p className="text-zinc-400 text-xs truncate">{s.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create app/(app)/live/page.tsx**
```tsx
// app/(app)/live/page.tsx
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/tiers'
import TierGate from '@/components/ui/TierGate'
import AgeGate from '@/components/ui/AgeGate'
import LiveStreamsGrid from '@/components/live/LiveStreamsGrid'
import ChaturbateSection from '@/components/live/ChaturbateSection'
import Link from 'next/link'

export default async function LivePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users').select('tier').eq('id', user!.id).single()
  const tier = (profile?.tier ?? 'free') as any

  return (
    <AgeGate>
      <TierGate userTier={tier} required="inferno">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Live</h1>
            <Link
              href="/go-live"
              className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-red-500 transition flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Go Live
            </Link>
          </div>
          <LiveStreamsGrid />
          <ChaturbateSection />
        </div>
      </TierGate>
    </AgeGate>
  )
}
```

- [ ] **Step 8: Test live stream end-to-end**

On boss-server, verify nginx-rtmp is running:
```bash
systemctl status nginx
```

Open OBS → Settings → Stream → Custom → Server: `rtmp://zurix.co.ke/live` → Stream Key: (from /go-live)
Start streaming. Go to `/live` and verify the stream card appears and HLS player works.

- [ ] **Step 9: Commit**
```bash
git add -A && git commit -m "feat: add HLS live stream viewer and Chaturbate featured rooms"
```

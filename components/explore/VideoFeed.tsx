'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface VideoPost {
  id: string; caption?: string; media_urls: string[]; music_title?: string | null
  likes_count: number; users?: { username: string; display_name: string; avatar_url: string; is_verified?: boolean }
}

function VideoCard({ post, muted, onToggleMute }: { post: VideoPost; muted: boolean; onToggleMute: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(post.likes_count)

  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio > 0.6) { el.play().catch(() => {}); setPaused(false) }
      else { el.pause() }
    }, { threshold: [0, 0.6, 1] })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function togglePlay() {
    const el = ref.current; if (!el) return
    if (el.paused) { el.play().catch(() => {}); setPaused(false) } else { el.pause(); setPaused(true) }
  }

  async function like() {
    if (liked) return
    setLiked(true); setLikes(n => n + 1)
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: 'post', targetId: post.id }) })
  }

  return (
    <div className="relative h-full w-full snap-start flex-shrink-0 bg-black flex items-center justify-center">
      <video ref={ref} src={post.media_urls[0]} loop playsInline muted={muted} onClick={togglePlay}
        className="h-full w-full object-contain" />
      {paused && <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center text-white/80 text-6xl">▶</button>}

      {/* right action rail */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 text-white">
        <button onClick={like} className="flex flex-col items-center text-2xl">{liked ? '❤️' : '🤍'}<span className="text-xs mt-1">{likes}</span></button>
        <button onClick={onToggleMute} className="text-2xl">{muted ? '🔇' : '🔊'}</button>
      </div>

      {/* bottom meta */}
      <div className="absolute bottom-20 sm:bottom-6 left-3 right-16 text-white">
        {post.users && (
          <Link href={`/profile/${post.users.username}`} className="flex items-center gap-2 mb-1">
            <span className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 block border border-white/40">
              {post.users.avatar_url && <Image src={post.users.avatar_url} alt="" fill className="object-cover" unoptimized />}
            </span>
            <span className="font-semibold text-sm">{post.users.display_name}{post.users.is_verified && <span className="text-amber-400 ml-1">✓</span>}</span>
          </Link>
        )}
        {post.caption && <p className="text-sm">{post.caption}</p>}
        {post.music_title && <p className="text-xs opacity-80 mt-1">🎵 {post.music_title}</p>}
      </div>
    </div>
  )
}

export default function VideoFeed() {
  const [videos, setVideos] = useState<VideoPost[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [muted, setMuted] = useState(true)
  const sentinel = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const d = await fetch(`/api/videos?page=${page}`).then(r => r.json())
    setVideos(v => [...v, ...(d.videos ?? [])])
    setHasMore(d.hasMore ?? false)
    setPage(p => p + 1)
    setLoading(false)
  }, [loading, hasMore, page])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) load() }, { threshold: 0.1 })
    if (sentinel.current) obs.observe(sentinel.current)
    return () => obs.disconnect()
  }, [load])

  if (videos.length === 0 && !loading) {
    return <p className="text-center text-[var(--muted)] py-16">No videos yet. Post a video to start the feed!</p>
  }

  return (
    <div className="h-[calc(100vh-12rem)] overflow-y-auto snap-y snap-mandatory rounded-xl scrollbar-hide bg-black">
      {videos.map(v => <div key={v.id} className="h-full snap-start"><VideoCard post={v} muted={muted} onToggleMute={() => setMuted(m => !m)} /></div>)}
      <div ref={sentinel} className="h-2" />
    </div>
  )
}

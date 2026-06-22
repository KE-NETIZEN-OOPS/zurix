'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

interface PostUser { id: string; username: string; display_name: string; avatar_url: string; is_verified: boolean }
interface Post { id: string; caption: string; media_urls: string[]; media_type?: string; music_url?: string | null; music_title?: string | null; likes_count: number; created_at: string; users: PostUser }

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [musicOn, setMusicOn] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => { if (audioRef.current) audioRef.current.volume = 0.6 }, [])

  async function handleLike() {
    if (liked) return
    setLiked(true); setLikesCount(prev => prev + 1)
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: 'post', targetId: post.id }) })
  }

  function toggleMusic() {
    const a = audioRef.current; if (!a) return
    if (musicOn) { a.pause() } else { a.play().catch(() => {}) }
    setMusicOn(!musicOn)
  }

  const url = post.media_urls?.[0]
  const isVideo = post.media_type === 'video' || /\.(mp4|webm|mov)$/i.test(url ?? '')

  return (
    <div className="bg-[var(--card)] rounded-xl overflow-hidden border border-[var(--border)]">
      <div className="flex items-center gap-3 p-3">
        <Link href={`/profile/${post.users.username}`}>
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-[var(--border)] bg-zinc-800">
            {post.users.avatar_url && <Image src={post.users.avatar_url} alt="" fill className="object-cover" unoptimized />}
          </div>
        </Link>
        <div>
          <Link href={`/profile/${post.users.username}`} className="font-semibold text-sm hover:text-[var(--accent)]">{post.users.display_name}</Link>
          {post.users.is_verified && <span className="text-[var(--accent)] text-xs ml-1">✓</span>}
        </div>
      </div>
      {url && (
        <div className="relative aspect-square bg-black">
          {isVideo
            ? <video src={url} controls loop playsInline className="absolute inset-0 w-full h-full object-cover" />
            : <Image src={url} alt={post.caption} fill className="object-cover" unoptimized />}
          {post.music_url && (
            <button onClick={toggleMusic} className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs">
              <span className={musicOn ? 'animate-pulse' : ''}>🎵</span>
              <span className="truncate max-w-[140px]">{post.music_title ?? 'Audio'}</span>
              <span>{musicOn ? '⏸' : '▶'}</span>
              <audio ref={audioRef} src={post.music_url} loop />
            </button>
          )}
        </div>
      )}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button onClick={handleLike} className={`text-xl transition ${liked ? 'scale-110' : 'hover:scale-110'}`}>{liked ? '❤️' : '🤍'}</button>
          <span className="text-sm text-[var(--muted)]">{likesCount} likes</span>
        </div>
        {post.caption && <p className="text-sm">{post.caption}</p>}
      </div>
    </div>
  )
}

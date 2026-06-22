'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export interface PostData {
  id: string
  caption?: string
  media_urls: string[]
  media_type?: string
  music_url?: string | null
  music_title?: string | null
  likes_count: number
  users?: { username: string; display_name: string; avatar_url: string; is_verified?: boolean }
}

export default function PostModal({ post, onClose }: { post: PostData; onClose: () => void }) {
  const [likes, setLikes] = useState(post.likes_count)
  const [liked, setLiked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (post.music_url && audioRef.current) {
      audioRef.current.volume = 0.6
      audioRef.current.play().catch(() => {})
    }
  }, [post.music_url])

  async function like() {
    if (liked) return
    setLiked(true); setLikes(n => n + 1)
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: 'post', targetId: post.id }) })
  }

  const url = post.media_urls?.[0]
  const isVideo = post.media_type === 'video' || /\.(mp4|webm|mov)$/i.test(url ?? '')

  return (
    <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {post.users && (
          <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
            <Link href={`/profile/${post.users.username}`} onClick={onClose} className="flex items-center gap-2">
              <span className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 block">
                {post.users.avatar_url && <Image src={post.users.avatar_url} alt="" fill className="object-cover" unoptimized />}
              </span>
              <span className="text-sm font-semibold">{post.users.display_name}{post.users.is_verified && <span className="text-[var(--accent)] text-xs ml-1">✓</span>}</span>
            </Link>
            <button onClick={onClose} className="ml-auto text-[var(--muted)] hover:text-[var(--text)]">✕</button>
          </div>
        )}
        <div className="relative bg-black flex items-center justify-center" style={{ minHeight: '40vh', maxHeight: '60vh' }}>
          {url && (isVideo
            ? <video src={url} controls autoPlay loop playsInline className="max-h-[60vh] w-auto" />
            : <Image src={url} alt={post.caption ?? ''} width={500} height={500} className="max-h-[60vh] w-auto object-contain" unoptimized />
          )}
          {post.music_url && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs">
              <span className="animate-pulse">🎵</span>
              <span className="truncate">{post.music_title ?? 'Audio'}</span>
              <audio ref={audioRef} src={post.music_url} loop />
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button onClick={like} className={`text-2xl transition ${liked ? 'scale-110' : 'hover:scale-110'}`}>{liked ? '❤️' : '🤍'}</button>
            <span className="text-sm text-[var(--muted)]">{likes.toLocaleString()} likes</span>
          </div>
          {post.caption && <p className="text-sm">{post.caption}</p>}
        </div>
      </div>
    </div>
  )
}

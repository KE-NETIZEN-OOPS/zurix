'use client'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'

interface Story { id: string; media_url: string; media_type?: string; music_url?: string | null; music_title?: string | null; caption?: string | null; users: { username: string; display_name: string; avatar_url: string } }

export default function StoryViewer({ stories, startIndex, onClose }: { stories: Story[]; startIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(startIndex)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const story = stories[current]
  const isVideo = story.media_type === 'video' || /\.(mp4|webm|mov)$/i.test(story.media_url)

  useEffect(() => {
    setProgress(0)
    // music
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    if (story.music_url) { a.src = story.music_url; a.volume = 0.7; a.play().catch(() => {}) } else { a.pause() }
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (current < stories.length - 1) { setCurrent(c => c + 1); return 0 }
          onClose(); return 100
        }
        return prev + 1.5
      })
    }, 100)
    return () => clearInterval(interval)
  }, [current, stories.length, onClose, story.music_url])

  useEffect(() => () => { audioRef.current?.pause() }, [])

  const u = story.users

  return (
    <div className="fixed inset-0 bg-black z-[65] flex flex-col"
      onClick={e => {
        const half = window.innerWidth / 2
        if (e.clientX < half) { if (current > 0) { setCurrent(c => c - 1) } else onClose() }
        else { if (current < stories.length - 1) { setCurrent(c => c + 1) } else onClose() }
      }}>
      <div className="flex gap-1 p-2">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: i < current ? '100%' : i === current ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/30 bg-zinc-700">
          {u.avatar_url && <Image src={u.avatar_url} alt="" fill className="object-cover" unoptimized />}
        </div>
        <span className="text-white text-sm font-medium">{u.display_name}</span>
        {story.music_url && <span className="text-white text-xs flex items-center gap-1">🎵 <span className="truncate max-w-[120px]">{story.music_title}</span></span>}
        <button onClick={e => { e.stopPropagation(); onClose() }} className="ml-auto text-white text-xl">✕</button>
      </div>
      <div className="flex-1 relative">
        {isVideo
          ? <video src={story.media_url} autoPlay playsInline className="absolute inset-0 w-full h-full object-contain" />
          : <Image src={story.media_url} alt="" fill className="object-contain" unoptimized />}
        {story.caption && <p className="absolute bottom-8 left-0 right-0 text-center text-white text-base font-semibold drop-shadow px-4">{story.caption}</p>}
      </div>
    </div>
  )
}

'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'

interface Story { id: string; media_url: string; users: { username: string; display_name: string; avatar_url: string } }

export default function StoryViewer({ stories, startIndex, onClose }: { stories: Story[]; startIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(startIndex)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (current < stories.length - 1) { setCurrent(c => c + 1); return 0 }
          else { onClose(); return 100 }
        }
        return prev + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [current, stories.length, onClose])

  const story = stories[current]
  const u = story.users

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col"
      onClick={e => {
        const half = window.innerWidth / 2
        if (e.clientX < half) { if (current > 0) { setCurrent(c => c - 1); setProgress(0) } else onClose() }
        else { if (current < stories.length - 1) { setCurrent(c => c + 1); setProgress(0) } else onClose() }
      }}>
      <div className="flex gap-1 p-2">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: i < current ? '100%' : i === current ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/30">
          {u.avatar_url && <Image src={u.avatar_url} alt="" fill className="object-cover" unoptimized />}
        </div>
        <span className="text-white text-sm font-medium">{u.display_name}</span>
        <button onClick={e => { e.stopPropagation(); onClose() }} className="ml-auto text-white text-xl">✕</button>
      </div>
      <div className="flex-1 relative">
        <Image src={story.media_url} alt="" fill className="object-contain" unoptimized />
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Story { id: string; media_url: string; users: { username: string; display_name: string; avatar_url: string } }

export default function StoriesRow({ onSelect }: { onSelect: (stories: Story[], startIndex: number) => void }) {
  const [stories, setStories] = useState<Story[]>([])
  useEffect(() => { fetch('/api/stories').then(r => r.json()).then(d => setStories(d.stories ?? [])) }, [])

  const byUser = stories.reduce<Record<string, Story[]>>((acc, s) => {
    const key = s.users.username; if (!acc[key]) acc[key] = []; acc[key].push(s); return acc
  }, {})
  const users = Object.values(byUser)
  if (users.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-hide">
      {users.map((userStories) => {
        const u = userStories[0].users
        return (
          <button key={u.username} onClick={() => onSelect(userStories, 0)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative w-14 h-14 rounded-full border-2 border-amber-500 overflow-hidden">
              {u.avatar_url && <Image src={u.avatar_url} alt={u.display_name} fill className="object-cover" unoptimized />}
            </div>
            <span className="text-xs text-zinc-400 truncate w-14 text-center">{u.display_name}</span>
          </button>
        )
      })}
    </div>
  )
}

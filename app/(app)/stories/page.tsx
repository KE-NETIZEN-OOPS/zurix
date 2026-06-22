'use client'
import { useState } from 'react'
import StoriesRow from '@/components/stories/StoriesRow'
import StoryViewer from '@/components/stories/StoryViewer'
import CreateStory from '@/components/stories/CreateStory'

interface Story { id: string; media_url: string; media_type?: string; music_url?: string | null; music_title?: string | null; caption?: string | null; users: { username: string; display_name: string; avatar_url: string } }

export default function StoriesPage() {
  const [activeStories, setActiveStories] = useState<Story[] | null>(null)
  const [startIndex, setStartIndex] = useState(0)
  const [composing, setComposing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Stories</h1>
        <button onClick={() => setComposing(true)} className="bg-[var(--accent)] text-black font-bold px-4 py-2 rounded-full text-sm">+ Add Story</button>
      </div>
      <StoriesRow key={refreshKey} onSelect={(stories, i) => { setActiveStories(stories); setStartIndex(i) }} />
      <p className="text-[var(--muted)] text-sm text-center mt-8">Stories disappear after 24 hours. Follow people to see theirs.</p>
      {activeStories && <StoryViewer stories={activeStories} startIndex={startIndex} onClose={() => setActiveStories(null)} />}
      {composing && <CreateStory onClose={() => setComposing(false)} onPosted={() => setRefreshKey(k => k + 1)} />}
    </div>
  )
}

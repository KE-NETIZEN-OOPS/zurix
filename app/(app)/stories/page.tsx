'use client'
import { useState } from 'react'
import StoriesRow from '@/components/stories/StoriesRow'
import StoryViewer from '@/components/stories/StoryViewer'

interface Story { id: string; media_url: string; users: { username: string; display_name: string; avatar_url: string } }

export default function StoriesPage() {
  const [activeStories, setActiveStories] = useState<Story[] | null>(null)
  const [startIndex, setStartIndex] = useState(0)
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Stories</h1>
      <StoriesRow onSelect={(stories, i) => { setActiveStories(stories); setStartIndex(i) }} />
      <p className="text-zinc-500 text-sm text-center mt-8">Stories disappear after 24 hours. Follow people to see their stories.</p>
      {activeStories && <StoryViewer stories={activeStories} startIndex={startIndex} onClose={() => setActiveStories(null)} />}
    </div>
  )
}

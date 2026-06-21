'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ProfileCard from './ProfileCard'

interface Profile {
  id: string; username: string; display_name: string
  age: number; location_city: string; avatar_url: string; is_verified: boolean
}

export default function ExploreGrid() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const res = await fetch(`/api/explore?page=${page}`)
    const data = await res.json()
    setProfiles(prev => [...prev, ...(data.profiles ?? [])])
    setHasMore(data.hasMore ?? false)
    setPage(prev => prev + 1)
    setLoading(false)
  }, [loading, hasMore, page])

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { threshold: 0.1 })
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => { loadMore() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInterested(id: string) {
    await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'profile', targetId: id }),
    })
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {profiles.map(p => <ProfileCard key={p.id} profile={p} onInterested={handleInterested} />)}
      </div>
      <div ref={loaderRef} className="py-8 text-center text-zinc-600">
        {loading && <span>Loading...</span>}
        {!hasMore && profiles.length > 0 && <span>You&apos;ve seen everyone!</span>}
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ProfileCard from './ProfileCard'
import VideoFeed from './VideoFeed'

interface Profile {
  id: string; username: string; display_name: string
  age: number; location_city: string; avatar_url: string; is_verified: boolean; distanceMiles?: number | null
}

export default function ExploreGrid() {
  const [tab, setTab] = useState<'photos' | 'videos'>('photos')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locTried, setLocTried] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [gender, setGender] = useState('all')
  const loaderRef = useRef<HTMLDivElement>(null)
  const reqId = useRef(0)

  // Try precise geolocation once; fall back to stored profile coords.
  useEffect(() => {
    if (!navigator.geolocation) { setLocTried(true); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocTried(true) },
      async () => {
        const me = await fetch('/api/me').then(r => r.json()).catch(() => null)
        if (me?.latitude != null) setCoords({ lat: me.latitude, lng: me.longitude })
        setLocTried(true)
      },
      { enableHighAccuracy: true, timeout: 7000 }
    )
  }, [])

  const buildUrl = useCallback((p: number) => {
    const params = new URLSearchParams({ page: String(p) })
    if (q.trim()) params.set('q', q.trim())
    if (minAge) params.set('minAge', minAge)
    if (maxAge) params.set('maxAge', maxAge)
    if (gender !== 'all') params.set('gender', gender)
    if (shuffle || !coords) params.set('shuffle', '1')
    else if (coords) { params.set('lat', String(coords.lat)); params.set('lng', String(coords.lng)) }
    return `/api/explore?${params.toString()}`
  }, [q, minAge, maxAge, gender, shuffle, coords])

  const loadPage = useCallback(async (p: number, replace: boolean) => {
    setLoading(true)
    const myReq = ++reqId.current
    const d = await fetch(buildUrl(p)).then(r => r.json()).catch(() => ({ profiles: [], hasMore: false }))
    if (myReq !== reqId.current) return
    setProfiles(prev => replace ? (d.profiles ?? []) : [...prev, ...(d.profiles ?? [])])
    setHasMore(d.hasMore ?? false)
    setPage(p)
    setLoading(false)
  }, [buildUrl])

  // Reload from page 0 whenever filters/coords/shuffle change (photos tab only).
  useEffect(() => {
    if (tab !== 'photos' || !locTried) return
    const t = setTimeout(() => loadPage(0, true), q ? 350 : 0)
    return () => clearTimeout(t)
  }, [q, minAge, maxAge, gender, shuffle, coords, locTried, tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== 'photos') return
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting && hasMore && !loading) loadPage(page + 1, false) }, { threshold: 0.1 })
    if (loaderRef.current) obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [hasMore, loading, page, tab, loadPage])

  async function handleInterested(id: string) {
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: 'profile', targetId: id }) })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('photos')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${tab === 'photos' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--card)] text-[var(--muted)]'}`}>📷 Photos</button>
        <button onClick={() => setTab('videos')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${tab === 'videos' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--card)] text-[var(--muted)]'}`}>🎬 Videos</button>
      </div>

      {tab === 'videos' ? <VideoFeed /> : (
        <>
          <div className="flex gap-2 mb-3">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or location…"
              className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
            <button onClick={() => setShowFilters(s => !s)} className="px-3 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm">⚙</button>
            <button onClick={() => { setShuffle(true); loadPage(0, true) }} title="Shuffle" className="px-3 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm">🔀</button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 mb-3 items-center bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
              <input type="number" value={minAge} onChange={e => setMinAge(e.target.value)} placeholder="Min age" className="w-24 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm" />
              <input type="number" value={maxAge} onChange={e => setMaxAge(e.target.value)} placeholder="Max age" className="w-24 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm" />
              <select value={gender} onChange={e => setGender(e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm">
                <option value="all">Any gender</option><option value="female">Female</option><option value="male">Male</option><option value="non-binary">Non-binary</option><option value="other">Other</option>
              </select>
              <label className="flex items-center gap-1 text-sm text-[var(--muted)]">
                <input type="checkbox" checked={!shuffle && !!coords} onChange={e => setShuffle(!e.target.checked)} className="accent-[var(--accent)]" />
                Nearest first
              </label>
            </div>
          )}

          {coords && !shuffle && <p className="text-xs text-[var(--muted)] mb-2">📍 Showing people nearest to you</p>}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {profiles.map(p => <ProfileCard key={p.id} profile={p} onInterested={handleInterested} />)}
          </div>
          <div ref={loaderRef} className="py-8 text-center text-[var(--muted)] text-sm">
            {loading && <span>Loading…</span>}
            {!loading && profiles.length === 0 && <span>No one matches. Try widening your filters.</span>}
            {!hasMore && profiles.length > 0 && <span>You&apos;ve seen everyone!</span>}
          </div>
        </>
      )}
    </div>
  )
}

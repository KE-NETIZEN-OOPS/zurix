'use client'
import { useState, useEffect } from 'react'

export default function FollowButton({ profileId }: { profileId: string }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/follow?followingId=${profileId}`).then(r => r.json()).then(d => setIsFollowing(d.isFollowing))
  }, [profileId])

  async function toggle() {
    setLoading(true)
    await fetch('/api/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followingId: profileId, action: isFollowing ? 'unfollow' : 'follow' }) })
    setIsFollowing(prev => !prev)
    setLoading(false)
  }

  return (
    <button onClick={toggle} disabled={loading}
      className={`flex-1 font-bold py-2 rounded-full transition ${isFollowing ? 'border border-zinc-700 text-white hover:bg-zinc-800' : 'bg-amber-500 text-black hover:bg-amber-400'}`}>
      {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}

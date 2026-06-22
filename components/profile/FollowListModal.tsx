'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface U { id: string; username: string; display_name: string; avatar_url: string; is_verified: boolean }

export default function FollowListModal({ userId, type, onClose }: { userId: string; type: 'followers' | 'following'; onClose: () => void }) {
  const [users, setUsers] = useState<U[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/follow?list=${type}&userId=${userId}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false) })
  }, [userId, type])

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-bold capitalize">{type}</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)]">✕</button>
        </div>
        <div className="overflow-y-auto p-2">
          {loading && <p className="text-center text-[var(--muted)] py-6 text-sm">Loading…</p>}
          {!loading && users.length === 0 && <p className="text-center text-[var(--muted)] py-6 text-sm">No {type} yet.</p>}
          {users.map(u => (
            <Link key={u.id} href={`/profile/${u.username}`} onClick={onClose}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/20 transition">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                {u.avatar_url && <Image src={u.avatar_url} alt="" fill className="object-cover" unoptimized />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{u.display_name} {u.is_verified && <span className="text-[var(--accent)] text-xs">✓</span>}</p>
                <p className="text-xs text-[var(--muted)] truncate">@{u.username}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

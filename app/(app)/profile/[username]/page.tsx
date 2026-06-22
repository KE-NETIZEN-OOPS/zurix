'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import FollowButton from '@/components/profile/FollowButton'
import FollowListModal from '@/components/profile/FollowListModal'
import PostModal, { type PostData } from '@/components/posts/PostModal'

function memberSince(date: string): string {
  const months = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (months < 1) return 'New member'
  if (months === 1) return 'Member 1 month'
  return `Member ${months} months`
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const [data, setData] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null)
  const [activePost, setActivePost] = useState<PostData | null>(null)
  const [me, setMe] = useState<{ tier?: string; verified?: boolean } | null>(null)
  const [phone, setPhone] = useState<{ outgoing: string | null; theirPhone: string | null } | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`/api/profile/${username}`).then(r => r.ok ? r.json() : null).then(d => d ? setData(d) : setNotFound(true))
    fetch('/api/messages?quota=1').then(r => r.json()).then(setMe).catch(() => {})
  }, [username])

  useEffect(() => {
    if (data?.profile?.id) {
      fetch(`/api/phone-request?with=${data.profile.id}`).then(r => r.json()).then(setPhone).catch(() => {})
    }
  }, [data?.profile?.id])

  if (notFound) return <div className="text-center py-20 text-[var(--muted)]">Profile not found.</div>
  if (!data) return <div className="text-center py-20 text-[var(--muted)]">Loading…</div>

  const { profile, likesCount, followersCount, followingCount, posts } = data

  async function handleMessage() {
    if (!me?.verified) { setMsg('Verify your profile (add a photo) to message.'); return }
    if (!me?.tier || me.tier === 'free') { router.push('/payments'); return }
    router.push(`/chat?with=${profile.id}`)
  }

  async function requestPhone() {
    const res = await fetch('/api/phone-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: profile.id }) })
    const d = await res.json()
    if (!res.ok) { setMsg(d.error ?? 'Could not send request'); return }
    setPhone(p => ({ outgoing: 'pending', theirPhone: p?.theirPhone ?? null }))
    setMsg('Phone number request sent!')
  }

  const Stat = ({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center px-1.5" disabled={!onClick}>
      <span className="font-bold">{value.toLocaleString()}</span>
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </button>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-4 sm:gap-6 items-center mb-5">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex-shrink-0 border-2 border-[var(--accent)] bg-zinc-800">
          {profile.avatar_url && <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" unoptimized />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            {profile.is_verified && <span className="text-[var(--accent)] text-sm">✓</span>}
          </div>
          <p className="text-[var(--muted)] text-sm">@{profile.username} · {profile.age} · {profile.location_city}</p>
          <div className="flex gap-2 mt-2">
            <Stat label="posts" value={posts.length} />
            <Stat label="likes" value={likesCount} />
            <Stat label="followers" value={followersCount} onClick={() => setFollowModal('followers')} />
            <Stat label="following" value={followingCount} onClick={() => setFollowModal('following')} />
          </div>
        </div>
      </div>

      <p className="text-[var(--muted)] text-xs mb-2">{memberSince(profile.created_at)}</p>
      {profile.bio && <p className="text-sm mb-3">{profile.bio}</p>}
      {profile.interests?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(profile.interests as string[]).map((i: string) => <span key={i} className="bg-black/20 border border-[var(--border)] text-[var(--muted)] text-xs px-3 py-1 rounded-full">{i}</span>)}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <FollowButton profileId={profile.id} />
        <button onClick={handleMessage} className="flex-1 border border-[var(--border)] py-2 rounded-full hover:bg-black/20 transition text-sm font-semibold">Message</button>
      </div>

      <div className="mb-6">
        {phone?.theirPhone ? (
          <a href={`https://wa.me/${phone.theirPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
            className="block text-center bg-green-600 text-white py-2 rounded-full text-sm font-semibold hover:bg-green-500 transition">
            💬 {phone.theirPhone} — Open WhatsApp
          </a>
        ) : phone?.outgoing === 'pending' ? (
          <button disabled className="w-full border border-[var(--border)] text-[var(--muted)] py-2 rounded-full text-sm">⏳ Phone request pending…</button>
        ) : phone?.outgoing === 'declined' ? (
          <button disabled className="w-full border border-[var(--border)] text-[var(--muted)] py-2 rounded-full text-sm">Phone request declined</button>
        ) : (
          <button onClick={requestPhone} className="w-full border border-[var(--accent)] text-[var(--accent)] py-2 rounded-full text-sm font-semibold hover:bg-[var(--accent)]/10 transition">📞 Request Phone Number</button>
        )}
      </div>

      {msg && <p className="text-center text-xs text-[var(--accent)] mb-4">{msg}</p>}

      <div className="grid grid-cols-3 gap-1">
        {(posts as PostData[]).map(post => post.media_urls?.[0] && (
          <button key={post.id} onClick={() => setActivePost(post)} className="relative aspect-square overflow-hidden rounded-sm group">
            {(post.media_type === 'video' || /\.(mp4|webm|mov)$/i.test(post.media_urls[0]))
              ? <video src={post.media_urls[0]} className="w-full h-full object-cover" muted />
              : <Image src={post.media_urls[0]} alt="" fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />}
            {post.music_url && <span className="absolute top-1 right-1 text-xs">🎵</span>}
            {post.media_type === 'video' && <span className="absolute top-1 left-1 text-xs">▶</span>}
            {post.likes_count > 0 && <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 rounded px-1">❤ {post.likes_count}</span>}
          </button>
        ))}
      </div>

      {followModal && <FollowListModal userId={profile.id} type={followModal} onClose={() => setFollowModal(null)} />}
      {activePost && <PostModal post={activePost} onClose={() => setActivePost(null)} />}
    </div>
  )
}

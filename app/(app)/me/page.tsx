'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { tierLabel, type Tier } from '@/lib/tiers'
import FollowListModal from '@/components/profile/FollowListModal'
import PostModal, { type PostData } from '@/components/posts/PostModal'
import VerifyButton from '@/components/verify/VerifyButton'

export default function MyProfilePage() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [stats, setStats] = useState({ likesCount: 0, followersCount: 0, followingCount: 0 })
  const [posts, setPosts] = useState<PostData[]>([])
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null)
  const [activePost, setActivePost] = useState<PostData | null>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(async (meData) => {
      setMe(meData)
      if (meData?.username) {
        const p = await fetch(`/api/profile/${meData.username}`).then(r => r.json())
        setStats({ likesCount: p.likesCount ?? 0, followersCount: p.followersCount ?? 0, followingCount: p.followingCount ?? 0 })
        setPosts(p.posts ?? [])
      }
    })
  }, [])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!me) return <div className="text-center py-20 text-[var(--muted)]">Loading…</div>

  const Stat = ({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center px-2" disabled={!onClick}>
      <span className="font-bold text-lg">{value.toLocaleString()}</span>
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </button>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 sm:gap-6 mb-6">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex-shrink-0 border-2 border-[var(--accent)] bg-zinc-800">
          {me.avatar_url && <Image src={me.avatar_url} alt={me.display_name} fill className="object-cover" unoptimized />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{me.display_name}</h1>
            {me.is_verified && <span className="text-[var(--accent)] text-sm" title="Verified">✓</span>}
            <span className="text-[10px] uppercase font-bold bg-[var(--accent)] text-black px-2 py-0.5 rounded-full">{tierLabel((me.tier as Tier) ?? 'free')}</span>
          </div>
          <p className="text-[var(--muted)] text-sm">@{me.username}{me.age ? ` · ${me.age}` : ''}{me.location_city ? ` · ${me.location_city}` : ''}</p>
          <div className="flex gap-3 mt-2">
            <Stat label="posts" value={posts.length} />
            <Stat label="likes" value={stats.likesCount} />
            <Stat label="followers" value={stats.followersCount} onClick={() => setFollowModal('followers')} />
            <Stat label="following" value={stats.followingCount} onClick={() => setFollowModal('following')} />
          </div>
        </div>
      </div>

      {me.bio && <p className="text-sm mb-3">{me.bio}</p>}
      {me.interests?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(me.interests as string[]).map(i => <span key={i} className="bg-black/20 border border-[var(--border)] text-[var(--muted)] text-xs px-3 py-1 rounded-full">{i}</span>)}
        </div>
      )}

      {!me.is_verified && (
        <div className="mb-4"><VerifyButton userId={me.id} /></div>
      )}

      <div className="flex gap-3 mb-8">
        <Link href="/settings" className="flex-1 text-center bg-[var(--accent)] text-black font-bold py-2 rounded-full hover:opacity-90 transition">Edit Profile</Link>
        <Link href="/settings" className="border border-[var(--border)] px-4 py-2 rounded-full hover:bg-black/20 transition">⚙</Link>
        <button onClick={logout} className="border border-[var(--border)] px-4 py-2 rounded-full hover:bg-red-500/10 hover:text-red-400 transition">Log out</button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {posts.map(post => post.media_urls?.[0] && (
          <button key={post.id} onClick={() => setActivePost(post)} className="relative aspect-square overflow-hidden rounded-sm group">
            {(post.media_type === 'video' || /\.(mp4|webm|mov)$/i.test(post.media_urls[0]))
              ? <video src={post.media_urls[0]} className="w-full h-full object-cover" muted />
              : <Image src={post.media_urls[0]} alt="" fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />}
            {post.music_url && <span className="absolute top-1 right-1 text-xs">🎵</span>}
            {post.media_type === 'video' && <span className="absolute top-1 left-1 text-xs">▶</span>}
          </button>
        ))}
        {posts.length === 0 && <p className="col-span-3 text-center text-[var(--muted)] py-10 text-sm">No posts yet. Share your first photo or video!</p>}
      </div>

      {followModal && <FollowListModal userId={me.id} type={followModal} onClose={() => setFollowModal(null)} />}
      {activePost && <PostModal post={activePost} onClose={() => setActivePost(null)} />}
    </div>
  )
}

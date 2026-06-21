import Image from 'next/image'
import { notFound } from 'next/navigation'
import FollowButton from '@/components/profile/FollowButton'

async function getProfile(username: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/profile/${username}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

function memberSince(date: string): string {
  const months = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (months < 1) return 'New member'
  if (months === 1) return 'Member 1 month'
  return `Member ${months} months`
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const data = await getProfile(params.username)
  if (!data) notFound()
  const { profile, likesCount, posts } = data

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-6 items-start mb-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border-2 border-amber-500">
          {profile.avatar_url && <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" unoptimized />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            {profile.is_verified && <span className="text-amber-500 text-sm">✓</span>}
          </div>
          <p className="text-zinc-400 text-sm">@{profile.username} · {profile.age} yrs · {profile.location_city}</p>
          <p className="text-zinc-500 text-xs mt-1">{memberSince(profile.created_at)}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-amber-500 font-bold text-sm">❤ {(likesCount as number).toLocaleString()}</span>
            <span className="text-zinc-400 text-sm">likes</span>
          </div>
        </div>
      </div>
      {profile.bio && <p className="text-zinc-300 mb-4">{profile.bio}</p>}
      {profile.interests?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {(profile.interests as string[]).map(i => (
            <span key={i} className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-full">{i}</span>
          ))}
        </div>
      )}
      <div className="flex gap-3 mb-8">
        <FollowButton profileId={profile.id} />
        <button className="flex-1 border border-zinc-700 text-white py-2 rounded-full hover:bg-zinc-800 transition">Message</button>
        <button className="border border-zinc-700 text-white px-4 py-2 rounded-full hover:bg-zinc-800 transition">❤</button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {(posts as { id: string; media_urls: string[]; likes_count: number }[]).map(post =>
          post.media_urls?.[0] && (
            <div key={post.id} className="relative aspect-square overflow-hidden rounded-sm">
              <Image src={post.media_urls[0]} alt="" fill className="object-cover hover:scale-105 transition-transform" unoptimized />
              {post.likes_count > 0 && <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 rounded px-1">❤ {post.likes_count}</div>}
            </div>
          )
        )}
      </div>
    </div>
  )
}

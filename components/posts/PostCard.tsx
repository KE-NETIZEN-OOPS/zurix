'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

interface PostUser { id: string; username: string; display_name: string; avatar_url: string; is_verified: boolean }
interface Post { id: string; caption: string; media_urls: string[]; likes_count: number; created_at: string; users: PostUser }

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count)

  async function handleLike() {
    if (liked) return
    setLiked(true); setLikesCount(prev => prev + 1)
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: 'post', targetId: post.id }) })
  }

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
      <div className="flex items-center gap-3 p-3">
        <Link href={`/profile/${post.users.username}`}>
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-zinc-700">
            {post.users.avatar_url && <Image src={post.users.avatar_url} alt="" fill className="object-cover" unoptimized />}
          </div>
        </Link>
        <div>
          <Link href={`/profile/${post.users.username}`} className="font-semibold text-sm hover:text-amber-500">{post.users.display_name}</Link>
          {post.users.is_verified && <span className="text-amber-500 text-xs ml-1">✓</span>}
        </div>
      </div>
      {post.media_urls?.[0] && (
        <div className="relative aspect-square">
          <Image src={post.media_urls[0]} alt={post.caption} fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button onClick={handleLike} className={`text-xl transition ${liked ? 'text-red-500 scale-110' : 'text-zinc-400 hover:text-red-400'}`}>❤</button>
          <span className="text-sm text-zinc-400">{likesCount} likes</span>
        </div>
        {post.caption && <p className="text-sm text-zinc-300">{post.caption}</p>}
      </div>
    </div>
  )
}

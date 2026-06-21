'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import TierGate from '@/components/ui/TierGate'
import AgeGate from '@/components/ui/AgeGate'

export default function SpicyPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [tier, setTier] = useState<string>('free')

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setTier(d.tier ?? 'free'))
    fetch('/api/posts/spicy').then(r => r.json()).then(d => setPosts(d.posts ?? []))
  }, [])

  return (
    <AgeGate>
      <TierGate required="blaze" userTier={tier as any}>
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold">Spicy Feed</h1>
            <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">Blaze+</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {posts.map(post => (
              <div key={post.id} className="relative aspect-square rounded-xl overflow-hidden group">
                {post.media_urls?.[0] && (
                  <Image src={post.media_urls[0]} alt="" fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <Link href={`/profile/${post.users?.username}`} className="text-white text-xs font-semibold hover:text-amber-400">{post.users?.display_name}</Link>
                  {post.caption && <p className="text-zinc-300 text-xs truncate">{post.caption}</p>}
                </div>
              </div>
            ))}
            {posts.length === 0 && <p className="col-span-full text-zinc-500 text-center py-12">No spicy posts yet. Be the first to post!</p>}
          </div>
        </div>
      </TierGate>
    </AgeGate>
  )
}

'use client'
import { useEffect, useState } from 'react'
import PostCard from '@/components/posts/PostCard'
import CreatePost from '@/components/posts/CreatePost'

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  useEffect(() => { fetch('/api/posts?feed=following').then(r => r.json()).then(d => setPosts(d.posts ?? [])) }, [])
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Feed</h1>
      <CreatePost />
      <div className="flex flex-col gap-4">
        {posts.length === 0 && <p className="text-zinc-500 text-center py-8">Follow people to see their posts here.</p>}
        {posts.map(p => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  )
}

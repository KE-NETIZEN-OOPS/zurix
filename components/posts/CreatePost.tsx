'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatePost() {
  const router = useRouter()
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isSpicy, setIsSpicy] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); if (!file) return
    setLoading(true)
    const { uploadUrl, key } = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, contentType: file.type }) }).then(r => r.json())
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
    await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption, mediaUrls: [publicUrl], isSpicy }) })
    setCaption(''); setFile(null); setPreview(null); setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-6 flex flex-col gap-3">
      <h3 className="font-bold text-sm text-zinc-300">New Post</h3>
      <input type="file" accept="image/*,video/*" onChange={handleFile} className="text-sm text-zinc-400" />
      {preview && <img src={preview} alt="preview" className="rounded-lg max-h-48 object-cover" />}
      <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption..." rows={2}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-amber-500" />
      <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
        <input type="checkbox" checked={isSpicy} onChange={e => setIsSpicy(e.target.checked)} className="accent-amber-500" />
        Spicy content (Blaze+ only)
      </label>
      <button type="submit" disabled={loading || !file}
        className="bg-amber-500 text-black font-bold py-2 rounded-full hover:bg-amber-400 disabled:opacity-50 transition text-sm">
        {loading ? 'Posting...' : 'Post'}
      </button>
    </form>
  )
}

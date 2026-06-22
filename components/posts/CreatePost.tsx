'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadMedia } from '@/lib/storage'
import { FILTER_CSS, FILTER_NAMES, bakeImageFilter } from '@/components/media/filters'
import CameraCapture from '@/components/media/CameraCapture'
import MusicPicker from '@/components/media/MusicPicker'

export default function CreatePost() {
  const router = useRouter()
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [filter, setFilter] = useState('none')
  const [isSpicy, setIsSpicy] = useState(false)
  const [music, setMusic] = useState<{ url: string; title: string } | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [showMusic, setShowMusic] = useState(false)
  const [loading, setLoading] = useState(false)

  function setMedia(f: File) {
    setFile(f)
    setIsVideo(f.type.startsWith('video'))
    setPreview(URL.createObjectURL(f))
    setFilter('none')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (f) setMedia(f)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!file) return
    setLoading(true)
    try {
      let toUpload = file
      if (!isVideo && filter !== 'none') toUpload = await bakeImageFilter(file, filter)
      const url = await uploadMedia(toUpload, 'posts')
      await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption, mediaUrls: [url], isSpicy, mediaType: isVideo ? 'video' : 'image', musicUrl: music?.url ?? null, musicTitle: music?.title ?? null }),
      })
      setCaption(''); setFile(null); setPreview(null); setMusic(null); setIsSpicy(false)
      router.refresh()
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <form onSubmit={submit} className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 mb-6 flex flex-col gap-3">
      <h3 className="font-bold text-sm">New Post</h3>

      {!preview ? (
        <div className="flex gap-2">
          <label className="flex-1 text-center bg-[var(--bg)] border border-[var(--border)] py-3 rounded-lg text-sm cursor-pointer hover:border-[var(--accent)]">
            🖼 Photo / Video
            <input type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
          </label>
          <button type="button" onClick={() => setShowCamera(true)} className="flex-1 bg-[var(--bg)] border border-[var(--border)] py-3 rounded-lg text-sm hover:border-[var(--accent)]">📷 Camera</button>
        </div>
      ) : (
        <>
          <div className="relative rounded-lg overflow-hidden bg-black">
            {isVideo
              ? <video src={preview} controls className="w-full max-h-72 object-contain" />
              : <img src={preview} alt="preview" className="w-full max-h-72 object-contain" style={{ filter: FILTER_CSS[filter] }} />}
            <button type="button" onClick={() => { setFile(null); setPreview(null) }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 text-sm">✕</button>
          </div>
          {!isVideo && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {FILTER_NAMES.map(f => (
                <button key={f} type="button" onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1 rounded-full whitespace-nowrap capitalize ${filter === f ? 'bg-[var(--accent)] text-black font-bold' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]'}`}>{f}</button>
              ))}
            </div>
          )}
        </>
      )}

      <button type="button" onClick={() => setShowMusic(true)} className="text-left text-sm border border-[var(--border)] rounded-lg px-3 py-2 hover:border-[var(--accent)]">
        🎵 {music ? music.title : 'Add music'}
      </button>

      <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption…" rows={2}
        className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--accent)]" />

      <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
        <input type="checkbox" checked={isSpicy} onChange={e => setIsSpicy(e.target.checked)} className="accent-[var(--accent)]" />
        Spicy content (Blaze+ only)
      </label>

      <button type="submit" disabled={loading || !file} className="bg-[var(--accent)] text-black font-bold py-2 rounded-full hover:opacity-90 disabled:opacity-50 transition text-sm">
        {loading ? 'Posting…' : 'Post'}
      </button>

      {showCamera && <CameraCapture onCapture={f => { setMedia(f); setShowCamera(false) }} onClose={() => setShowCamera(false)} />}
      {showMusic && <MusicPicker onPick={t => { setMusic(t); setShowMusic(false) }} onClose={() => setShowMusic(false)} />}
    </form>
  )
}

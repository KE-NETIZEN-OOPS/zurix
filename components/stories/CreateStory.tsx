'use client'
import { useState } from 'react'
import { uploadMedia } from '@/lib/storage'
import { FILTER_CSS, FILTER_NAMES, bakeImageFilter } from '@/components/media/filters'
import CameraCapture from '@/components/media/CameraCapture'
import MusicPicker from '@/components/media/MusicPicker'

export default function CreateStory({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [filter, setFilter] = useState('none')
  const [caption, setCaption] = useState('')
  const [music, setMusic] = useState<{ url: string; title: string } | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [showMusic, setShowMusic] = useState(false)
  const [loading, setLoading] = useState(false)

  function setMedia(f: File) {
    setFile(f); setIsVideo(f.type.startsWith('video')); setPreview(URL.createObjectURL(f)); setFilter('none')
  }
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) setMedia(f) }

  async function post() {
    if (!file) return
    setLoading(true)
    try {
      let toUpload = file
      if (!isVideo && filter !== 'none') toUpload = await bakeImageFilter(file, filter)
      const url = await uploadMedia(toUpload, 'stories')
      await fetch('/api/stories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaUrl: url, mediaType: isVideo ? 'video' : 'image', musicUrl: music?.url ?? null, musicTitle: music?.title ?? null, caption }),
      })
      onPosted(); onClose()
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[65] flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold">New Story</h3>
          <button onClick={onClose} className="text-[var(--muted)]">✕</button>
        </div>

        {!preview ? (
          <div className="flex gap-2">
            <label className="flex-1 text-center bg-[var(--bg)] border border-[var(--border)] py-4 rounded-lg text-sm cursor-pointer hover:border-[var(--accent)]">
              🖼 Upload
              <input type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
            </label>
            <button type="button" onClick={() => setShowCamera(true)} className="flex-1 bg-[var(--bg)] border border-[var(--border)] py-4 rounded-lg text-sm hover:border-[var(--accent)]">📷 Camera</button>
          </div>
        ) : (
          <>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-80 mx-auto">
              {isVideo
                ? <video src={preview} controls className="w-full h-full object-contain" />
                : <img src={preview} alt="" className="w-full h-full object-contain" style={{ filter: FILTER_CSS[filter] }} />}
              {caption && <p className="absolute bottom-3 left-0 right-0 text-center text-white text-sm font-semibold drop-shadow px-2">{caption}</p>}
            </div>
            {!isVideo && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {FILTER_NAMES.map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1 rounded-full whitespace-nowrap capitalize ${filter === f ? 'bg-[var(--accent)] text-black font-bold' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]'}`}>{f}</button>
                ))}
              </div>
            )}
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption…" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
            <button onClick={() => setShowMusic(true)} className="text-left text-sm border border-[var(--border)] rounded-lg px-3 py-2">🎵 {music ? music.title : 'Add music'}</button>
            <button onClick={post} disabled={loading} className="bg-[var(--accent)] text-black font-bold py-2 rounded-full disabled:opacity-50">{loading ? 'Sharing…' : 'Share Story'}</button>
          </>
        )}

        {showCamera && <CameraCapture onCapture={f => { setMedia(f); setShowCamera(false) }} onClose={() => setShowCamera(false)} />}
        {showMusic && <MusicPicker onPick={t => { setMusic(t); setShowMusic(false) }} onClose={() => setShowMusic(false)} />}
      </div>
    </div>
  )
}

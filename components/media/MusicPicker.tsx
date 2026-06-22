'use client'
import { useEffect, useRef, useState } from 'react'
import { uploadMedia } from '@/lib/storage'

interface Track { id: string; title: string; artist: string; url: string; is_library: boolean }

export default function MusicPicker({ onPick, onClose }: { onPick: (t: { url: string; title: string } | null) => void; onClose: () => void }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch('/api/music').then(r => r.json()).then(d => setTracks(d.tracks ?? []))
    return () => { audioRef.current?.pause() }
  }, [])

  function preview(t: Track) {
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    if (playing === t.id) { a.pause(); setPlaying(null); return }
    a.src = t.url; a.volume = 0.7; a.play().catch(() => {}); setPlaying(t.id)
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setUploading(true)
    try {
      const url = await uploadMedia(f, 'music')
      const title = f.name.replace(/\.[^.]+$/, '')
      await fetch('/api/music', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, url }) })
      audioRef.current?.pause()
      onPick({ url, title })
    } catch { /* ignore */ }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-bold">Add music 🎵</h3>
          <button onClick={onClose} className="text-[var(--muted)]">✕</button>
        </div>
        <div className="overflow-y-auto p-2 flex-1">
          {tracks.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/20">
              <button onClick={() => preview(t)} className="w-9 h-9 rounded-full bg-[var(--accent)] text-black flex items-center justify-center flex-shrink-0">{playing === t.id ? '⏸' : '▶'}</button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{t.title}</p>
                <p className="text-xs text-[var(--muted)] truncate">{t.artist}{t.is_library ? '' : ' · your upload'}</p>
              </div>
              <button onClick={() => { audioRef.current?.pause(); onPick({ url: t.url, title: t.title }) }} className="text-xs bg-[var(--accent)] text-black font-bold px-3 py-1 rounded-full">Use</button>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-[var(--border)] flex gap-2">
          <button onClick={() => { audioRef.current?.pause(); onPick(null) }} className="flex-1 border border-[var(--border)] py-2 rounded-full text-sm">No music</button>
          <label className="flex-1 text-center bg-[var(--bg)] border border-[var(--border)] py-2 rounded-full text-sm cursor-pointer">
            {uploading ? 'Uploading…' : '⬆ Upload audio'}
            <input type="file" accept="audio/*" className="hidden" onChange={upload} disabled={uploading} />
          </label>
        </div>
      </div>
    </div>
  )
}

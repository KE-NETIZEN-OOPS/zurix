'use client'
import { useEffect, useState } from 'react'
import TierGate from '@/components/ui/TierGate'
import AgeGate from '@/components/ui/AgeGate'

interface Video { id: string; title: string; embed_url: string; thumbnail_url: string; duration_secs: number; tags: string[] }

export default function LivePage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [tier, setTier] = useState('free')
  const [active, setActive] = useState<Video | null>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setTier(d.tier ?? 'free'))
    fetch('/api/adult-videos').then(r => r.json()).then(d => setVideos(d.videos ?? []))
  }, [])

  function fmt(secs: number) { const m = Math.floor(secs / 60), s = secs % 60; return `${m}:${s.toString().padStart(2, '0')}` }

  return (
    <AgeGate>
      <TierGate required="blaze" userTier={tier as any}>
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold">Live & Adult</h1>
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">18+</span>
            <span className="bg-[var(--accent)] text-black text-xs font-bold px-2 py-0.5 rounded-full">Blaze+</span>
          </div>

          {active && (
            <div className="mb-6">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                <iframe src={active.embed_url} className="absolute inset-0 w-full h-full" allowFullScreen frameBorder="0" allow="autoplay; fullscreen" />
              </div>
              <div className="flex items-start justify-between mt-3">
                <div>
                  <h2 className="font-bold text-lg">{active.title}</h2>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {active.tags?.map(t => <span key={t} className="text-xs bg-[var(--card)] text-[var(--muted)] px-2 py-0.5 rounded-full">{t}</span>)}
                  </div>
                </div>
                <button onClick={() => setActive(null)} className="text-[var(--muted)] hover:text-[var(--text)] ml-4 text-sm">✕ Close</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map(v => (
              <button key={v.id} onClick={() => setActive(v)} className="text-left group">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-800">
                  {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">{fmt(v.duration_secs ?? 0)}</div>
                </div>
                <p className="text-sm text-[var(--text)] mt-1 line-clamp-2">{v.title}</p>
              </button>
            ))}
            {videos.length === 0 && <p className="col-span-full text-[var(--muted)] text-center py-12">No content curated yet. Admins can add streams from the Admin panel.</p>}
          </div>
        </div>
      </TierGate>
    </AgeGate>
  )
}

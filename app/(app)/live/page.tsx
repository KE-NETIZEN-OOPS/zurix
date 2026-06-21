'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import TierGate from '@/components/ui/TierGate'
import AgeGate from '@/components/ui/AgeGate'
import LivePlayer from '@/components/live/LivePlayer'

interface Stream { id: string; title: string; hls_url: string; thumbnail_url: string; viewer_count: number; users: { username: string; display_name: string; avatar_url: string } }
interface Room { slug: string; display_name: string; preview_url: string; viewers: number; embedUrl: string }

export default function LivePage() {
  const [tab, setTab] = useState<'zurix' | 'chaturbate'>('zurix')
  const [streams, setStreams] = useState<Stream[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tier, setTier] = useState('free')
  const [activeStream, setActiveStream] = useState<Stream | null>(null)
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setTier(d.tier ?? 'free'))
    fetch('/api/streams').then(r => r.json()).then(d => setStreams(d.streams ?? []))
  }, [])

  useEffect(() => {
    if (tab === 'chaturbate') {
      fetch('/api/chaturbate').then(r => r.json()).then(d => setRooms(d.rooms ?? []))
    }
  }, [tab])

  return (
    <AgeGate>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Live</h1>
          <Link href="/go-live" className="bg-red-600 text-white font-bold px-4 py-2 rounded-full text-sm hover:bg-red-500 transition">Go Live</Link>
        </div>
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('zurix')} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === 'zurix' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>ZuriX Live</button>
          <button onClick={() => setTab('chaturbate')} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === 'chaturbate' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Featured Rooms <span className="text-xs opacity-70">(Inferno)</span></button>
        </div>

        {tab === 'zurix' && (
          <>
            {activeStream && (
              <div className="mb-6">
                <LivePlayer hlsUrl={activeStream.hls_url} />
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <h2 className="font-bold">{activeStream.title}</h2>
                    <Link href={`/profile/${activeStream.users.username}`} className="text-zinc-400 text-sm hover:text-amber-500">{activeStream.users.display_name}</Link>
                  </div>
                  <button onClick={() => setActiveStream(null)} className="text-zinc-400 hover:text-white text-sm">✕ Close</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {streams.map(s => (
                <button key={s.id} onClick={() => setActiveStream(s)} className="text-left group">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800">
                    {s.thumbnail_url && <Image src={s.thumbnail_url} alt={s.title} fill className="object-cover" unoptimized />}
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">LIVE</div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">{s.viewer_count} watching</div>
                  </div>
                  <div className="mt-2 flex gap-2 items-center">
                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                      {s.users.avatar_url && <Image src={s.users.avatar_url} alt="" fill className="object-cover" unoptimized />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-amber-500">{s.title}</p>
                      <p className="text-xs text-zinc-400 truncate">{s.users.display_name}</p>
                    </div>
                  </div>
                </button>
              ))}
              {streams.length === 0 && <p className="col-span-full text-zinc-500 text-center py-12">No one is live right now. <Link href="/go-live" className="text-amber-500">Be the first!</Link></p>}
            </div>
          </>
        )}

        {tab === 'chaturbate' && (
          <TierGate required="inferno" userTier={tier as any}>
            <>
              {activeRoom && (
                <div className="mb-6">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                    <iframe src={activeRoom.embedUrl} className="absolute inset-0 w-full h-full" allowFullScreen frameBorder="0" allow="autoplay; fullscreen" />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <h2 className="font-bold">{activeRoom.display_name}</h2>
                    <button onClick={() => setActiveRoom(null)} className="text-zinc-400 hover:text-white text-sm">✕ Close</button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {rooms.map(r => (
                  <button key={r.slug} onClick={() => setActiveRoom(r)} className="text-left group">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800">
                      {r.preview_url && <img src={r.preview_url} alt={r.display_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">{r.viewers?.toLocaleString()} viewers</div>
                    </div>
                    <p className="text-sm font-semibold mt-1 truncate group-hover:text-amber-500">{r.display_name}</p>
                  </button>
                ))}
              </div>
            </>
          </TierGate>
        )}
      </div>
    </AgeGate>
  )
}

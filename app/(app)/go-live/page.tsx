'use client'
import { useState } from 'react'

export default function GoLivePage() {
  const [title, setTitle] = useState('')
  const [streamInfo, setStreamInfo] = useState<{ rtmpUrl: string; streamKey: string } | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(false)

  async function startStream() {
    setLoading(true)
    const res = await fetch('/api/streams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
    const data = await res.json()
    if (data.rtmpUrl) { setStreamInfo({ rtmpUrl: data.rtmpUrl, streamKey: data.streamKey }); setIsLive(true) }
    setLoading(false)
  }

  async function endStream() {
    await fetch('/api/streams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'end' }) })
    setIsLive(false); setStreamInfo(null)
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Go Live</h1>
      {!isLive ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col gap-4">
          <p className="text-zinc-400 text-sm">Use OBS, Streamlabs, or any RTMP streaming software to broadcast live.</p>
          <input type="text" placeholder="Stream title" value={title} onChange={e => setTitle(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
          <button onClick={startStream} disabled={loading || !title}
            className="bg-red-600 text-white font-bold py-3 rounded-full hover:bg-red-500 disabled:opacity-50 transition">
            {loading ? 'Starting...' : '🔴 Start Streaming'}
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" /><span className="font-bold text-red-400">LIVE</span></div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">RTMP Server URL</p>
            <code className="text-sm text-amber-400 bg-zinc-800 px-3 py-2 rounded-lg block break-all">{streamInfo?.rtmpUrl}</code>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Stream Key</p>
            <code className="text-sm text-amber-400 bg-zinc-800 px-3 py-2 rounded-lg block break-all">{streamInfo?.streamKey}</code>
          </div>
          <p className="text-zinc-400 text-sm">Paste the RTMP URL and Stream Key into OBS → Settings → Stream → Custom.</p>
          <button onClick={endStream} className="border border-red-600 text-red-400 font-bold py-3 rounded-full hover:bg-red-600/10 transition">End Stream</button>
        </div>
      )}
    </div>
  )
}

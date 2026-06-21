'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'videos' | 'rooms' | 'users'>('videos')
  const [isAdmin, setIsAdmin] = useState(false)
  const [videos, setVideos] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [videoForm, setVideoForm] = useState({ title: '', embed_url: '', thumbnail_url: '', duration_secs: '', tags: '' })
  const [roomForm, setRoomForm] = useState({ slug: '', display_name: '', preview_url: '' })

  useEffect(() => {
    fetch('/api/admin/check').then(r => r.json()).then(d => {
      if (!d.isAdmin) { router.push('/explore'); return }
      setIsAdmin(true)
      fetch('/api/admin/videos').then(r => r.json()).then(d => setVideos(d.videos ?? []))
      fetch('/api/admin/rooms').then(r => r.json()).then(d => setRooms(d.rooms ?? []))
    })
  }, [router])

  async function addVideo(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/admin/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...videoForm, duration_secs: parseInt(videoForm.duration_secs), tags: videoForm.tags.split(',').map(t => t.trim()) }) })
    fetch('/api/admin/videos').then(r => r.json()).then(d => setVideos(d.videos ?? []))
    setVideoForm({ title: '', embed_url: '', thumbnail_url: '', duration_secs: '', tags: '' })
  }

  async function addRoom(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/admin/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roomForm) })
    fetch('/api/admin/rooms').then(r => r.json()).then(d => setRooms(d.rooms ?? []))
    setRoomForm({ slug: '', display_name: '', preview_url: '' })
  }

  if (!isAdmin) return <div className="text-center py-20 text-zinc-500">Checking access...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="flex gap-2 mb-6">
        {(['videos', 'rooms', 'users'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === t ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'videos' && (
        <div className="space-y-6">
          <form onSubmit={addVideo} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 grid grid-cols-2 gap-4">
            <h2 className="col-span-2 font-bold">Add Adult Video</h2>
            {[['title', 'Title'], ['embed_url', 'Embed URL (eporner iframe src)'], ['thumbnail_url', 'Thumbnail URL'], ['duration_secs', 'Duration (seconds)'], ['tags', 'Tags (comma-separated)']].map(([key, label]) => (
              <div key={key} className="col-span-2">
                <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                <input type="text" value={videoForm[key as keyof typeof videoForm]} onChange={e => setVideoForm(p => ({ ...p, [key]: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              </div>
            ))}
            <button type="submit" className="col-span-2 bg-amber-500 text-black font-bold py-2 rounded-full hover:bg-amber-400 transition text-sm">Add Video</button>
          </form>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h2 className="font-bold mb-4">Videos ({videos.length})</h2>
            <div className="space-y-2">
              {videos.map((v: any) => (
                <div key={v.id} className="flex items-center gap-3 py-2 border-b border-zinc-800">
                  {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-16 h-10 object-cover rounded" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs text-zinc-500">{v.tags?.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'rooms' && (
        <div className="space-y-6">
          <form onSubmit={addRoom} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col gap-4">
            <h2 className="font-bold">Add Chaturbate Room</h2>
            {[['slug', 'Room slug (chaturbate.com/SLUG)'], ['display_name', 'Display name'], ['preview_url', 'Preview image URL']].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                <input type="text" value={roomForm[key as keyof typeof roomForm]} onChange={e => setRoomForm(p => ({ ...p, [key]: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              </div>
            ))}
            <button type="submit" className="bg-amber-500 text-black font-bold py-2 rounded-full hover:bg-amber-400 transition text-sm">Add Room</button>
          </form>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h2 className="font-bold mb-4">Rooms ({rooms.length})</h2>
            <div className="space-y-2">
              {rooms.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-zinc-800">
                  <p className="text-sm font-medium">{r.display_name}</p>
                  <p className="text-xs text-zinc-500">/{r.slug}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h2 className="font-bold mb-4">User Management</h2>
          <p className="text-zinc-500 text-sm">Use Supabase dashboard for full user management. Admin actions available via API.</p>
        </div>
      )}
    </div>
  )
}

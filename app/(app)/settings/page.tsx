'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => { fetch('/api/me').then(r => r.json()).then(setProfile) }, [])

  function handleField(key: string, value: unknown) { setProfile((p: any) => ({ ...p, [key]: value })) }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setSaved(false)
    let avatarUrl = profile.avatar_url
    if (avatarFile) {
      const { uploadUrl, key } = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: avatarFile.name, contentType: avatarFile.type }) }).then(r => r.json())
      await fetch(uploadUrl, { method: 'PUT', body: avatarFile, headers: { 'Content-Type': avatarFile.type } })
      avatarUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
    }
    await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, avatar_url: avatarUrl }) })
    setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const interestOptions = ['Travel', 'Music', 'Fitness', 'Cooking', 'Art', 'Tech', 'Fashion', 'Sports', 'Movies', 'Books', 'Gaming', 'Nightlife']

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <form onSubmit={save} className="flex flex-col gap-6">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col gap-4">
          <h2 className="font-bold">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500 cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
              {(avatarPreview ?? profile.avatar_url) && <Image src={avatarPreview ?? profile.avatar_url} alt="" fill className="object-cover" unoptimized />}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs">Edit</div>
            </div>
            <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <div className="text-sm text-zinc-400">Click avatar to change photo</div>
          </div>
          {[['display_name', 'Display name', 'text'], ['bio', 'Bio', 'text'], ['location_city', 'City', 'text'], ['phone', 'WhatsApp number', 'tel']].map(([key, label, type]) => (
            <div key={key}>
              <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
              <input type={type} value={profile[key] ?? ''} onChange={e => handleField(key, e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
          ))}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Gender</label>
            <select value={profile.gender ?? ''} onChange={e => handleField('gender', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Interests</label>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map(i => {
                const selected = (profile.interests ?? []).includes(i)
                return <button key={i} type="button" onClick={() => handleField('interests', selected ? (profile.interests ?? []).filter((x: string) => x !== i) : [...(profile.interests ?? []), i])}
                  className={`text-xs px-3 py-1 rounded-full transition ${selected ? 'bg-amber-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{i}</button>
              })}
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col gap-4">
          <h2 className="font-bold">Privacy</h2>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-sm">Hide my data</p>
              <p className="text-zinc-500 text-xs">Your profile won&apos;t appear in Explore. Inferno only.</p>
            </div>
            <input type="checkbox" checked={profile.hide_data ?? false} onChange={e => handleField('hide_data', e.target.checked)} className="accent-amber-500 w-5 h-5" />
          </label>
        </div>
        <button type="submit" disabled={loading} className="bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition">
          {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

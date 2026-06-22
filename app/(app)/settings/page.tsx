'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadMedia } from '@/lib/storage'
import { THEMES } from '@/lib/tiers'

const interestOptions = ['Travel', 'Music', 'Fitness', 'Cooking', 'Art', 'Tech', 'Fashion', 'Sports', 'Movies', 'Books', 'Gaming', 'Nightlife', 'Dancing', 'Photography', 'Nature']

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pw, setPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => { fetch('/api/me').then(r => r.json()).then(setProfile) }, [])

  function handleField(key: string, value: unknown) { setProfile((p: any) => ({ ...p, [key]: value })) }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setSaved(false)
    let avatarUrl = profile.avatar_url
    try {
      if (avatarFile) avatarUrl = await uploadMedia(avatarFile, 'avatars')
    } catch { setLoading(false); setPwMsg('Avatar upload failed'); return }
    await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, avatar_url: avatarUrl }) })
    setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  async function applyTheme(name: string) {
    handleField('theme', name)
    await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: name }) })
    router.refresh()
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault(); setPwMsg('')
    if (pw.length < 8) { setPwMsg('Password must be at least 8 characters.'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwMsg(error ? error.message : 'Password updated ✓'); setPw('')
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login'); router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <form onSubmit={save} className="flex flex-col gap-6">
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 flex flex-col gap-4">
          <h2 className="font-bold">Profile</h2>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => document.getElementById('avatar-input')?.click()} className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--accent)] bg-zinc-800">
              {(avatarPreview ?? profile.avatar_url) && <Image src={avatarPreview ?? profile.avatar_url} alt="" fill className="object-cover" unoptimized />}
              <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px]">Edit</span>
            </button>
            <input id="avatar-input" type="file" accept="image/*" capture="user" className="hidden" onChange={handleAvatarChange} />
            <div className="text-xs text-[var(--muted)]">Tap to change photo (or take one). Adding a photo verifies your account.</div>
          </div>
          {[['display_name', 'Display name', 'text'], ['location_city', 'City', 'text'], ['phone', 'WhatsApp number', 'tel']].map(([key, label, type]) => (
            <div key={key}>
              <label className="text-xs text-[var(--muted)] mb-1 block">{label}</label>
              <input type={type} value={profile[key] ?? ''} onChange={e => handleField(key, e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Bio</label>
            <textarea value={profile.bio ?? ''} onChange={e => handleField('bio', e.target.value)} rows={3} placeholder="Tell people about you…"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm resize-none focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Gender</label>
            <select value={profile.gender ?? ''} onChange={e => handleField('gender', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]">
              <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="non-binary">Non-binary</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Interests</label>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map(i => {
                const selected = (profile.interests ?? []).includes(i)
                return <button key={i} type="button" onClick={() => handleField('interests', selected ? (profile.interests ?? []).filter((x: string) => x !== i) : [...(profile.interests ?? []), i])}
                  className={`text-xs px-3 py-1 rounded-full transition ${selected ? 'bg-[var(--accent)] text-black font-bold' : 'bg-black/20 border border-[var(--border)] text-[var(--muted)]'}`}>{i}</button>
              })}
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 flex flex-col gap-3">
          <h2 className="font-bold">Theme</h2>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(THEMES).map(([name, t]) => (
              <button key={name} type="button" onClick={() => applyTheme(name)}
                className={`rounded-xl p-3 border-2 transition ${profile.theme === name ? 'border-[var(--accent)]' : 'border-transparent'}`}
                style={{ background: t.bg }}>
                <div className="flex gap-1 mb-2">
                  <span className="w-4 h-4 rounded-full" style={{ background: t.accent }} />
                  <span className="w-4 h-4 rounded-full" style={{ background: t.card }} />
                </div>
                <span className="text-[10px] block text-left" style={{ color: t.text }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 flex flex-col gap-4">
          <h2 className="font-bold">Privacy</h2>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-sm">Hide my data</p>
              <p className="text-[var(--muted)] text-xs">Your profile won&apos;t appear in Explore.</p>
            </div>
            <input type="checkbox" checked={profile.hide_data ?? false} onChange={e => handleField('hide_data', e.target.checked)} className="accent-[var(--accent)] w-5 h-5" />
          </label>
        </div>

        <button type="submit" disabled={loading} className="bg-[var(--accent)] text-black font-bold py-3 rounded-full hover:opacity-90 disabled:opacity-50 transition">
          {loading ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </form>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 flex flex-col gap-3 mt-6">
        <h2 className="font-bold">Reset password</h2>
        <form onSubmit={resetPassword} className="flex flex-col gap-3">
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password (min 8 chars)"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
          <button type="submit" className="border border-[var(--border)] py-2 rounded-full text-sm font-semibold hover:bg-black/20 transition">Update Password</button>
          {pwMsg && <p className={`text-xs ${pwMsg.includes('✓') ? 'text-green-400' : 'text-red-400'}`}>{pwMsg}</p>}
        </form>
      </div>

      <button onClick={logout} className="w-full mt-6 border border-[var(--border)] text-red-400 py-3 rounded-full font-semibold hover:bg-red-500/10 transition">Log out</button>
    </div>
  )
}

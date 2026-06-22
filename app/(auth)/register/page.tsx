'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { geocodeCity } from '@/lib/geo'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', display_name: '', age: '', gender: 'female', location_city: '', phone: '' })
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function useMyLocation() {
    setLocating(true); setError('')
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => { setError('Could not get your location. You can still type your city.'); setLocating(false) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (parseInt(form.age) < 18) { setError('You must be 18 or older to join ZuriX.'); return }
    if (!form.location_city.trim()) { setError('Location is required.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (signUpError || !data.user) { setError(signUpError?.message ?? 'Sign up failed'); setLoading(false); return }

    // Resolve coordinates: precise geolocation if granted, else geocode the city.
    let lat: number | null = coords?.lat ?? null
    let lng: number | null = coords?.lng ?? null
    if (lat == null) {
      const g = geocodeCity(form.location_city)
      if (g) { lat = g[0] + (Math.random() - 0.5) * 0.06; lng = g[1] + (Math.random() - 0.5) * 0.06 }
    }

    const username = form.display_name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 999)
    await supabase.from('users').insert({
      id: data.user.id, username, display_name: form.display_name, email: form.email, phone: form.phone,
      age: parseInt(form.age), gender: form.gender, location_city: form.location_city,
      latitude: lat, longitude: lng,
    })
    router.push('/explore')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Create your account</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <input type="text" placeholder="Display name" required value={form.display_name}
        onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
      <input type="email" placeholder="Email" required value={form.email}
        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
      <input type="password" placeholder="Password (min 8 chars)" required value={form.password}
        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
      <div className="flex gap-3">
        <input type="number" placeholder="Age (18+)" required value={form.age}
          onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
          className="w-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
        <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
          className="w-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500">
          <option value="female">Female</option><option value="male">Male</option><option value="non-binary">Non-binary</option><option value="other">Other</option>
        </select>
      </div>
      <input type="text" placeholder="Your city / location (required)" required value={form.location_city}
        onChange={e => setForm(p => ({ ...p, location_city: e.target.value }))}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
      <button type="button" onClick={useMyLocation}
        className={`text-sm py-2 rounded-lg border transition ${coords ? 'border-green-500 text-green-400' : 'border-zinc-700 text-zinc-300 hover:border-amber-500'}`}>
        {locating ? 'Locating…' : coords ? '✓ Location captured — show people near you' : '📍 Use my exact location (recommended)'}
      </button>
      <input type="tel" placeholder="WhatsApp number (optional)" value={form.phone}
        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />

      <button type="submit" disabled={loading}
        className="bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition">
        {loading ? 'Creating account…' : 'Join ZuriX'}
      </button>
      <p className="text-zinc-500 text-sm text-center">Already have an account? <Link href="/login" className="text-amber-500">Sign in</Link></p>
      <p className="text-zinc-600 text-xs text-center">By joining you confirm you are 18+ and agree to our terms.</p>
    </form>
  )
}

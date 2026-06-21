'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', display_name: '', age: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (parseInt(form.age) < 18) { setError('You must be 18 or older to join ZuriX.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (signUpError || !data.user) { setError(signUpError?.message ?? 'Sign up failed'); setLoading(false); return }
    const username = form.display_name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 999)
    await supabase.from('users').insert({ id: data.user.id, username, display_name: form.display_name, email: form.email, phone: form.phone, age: parseInt(form.age) })
    router.push('/explore')
  }

  const fields = [
    { name: 'display_name', placeholder: 'Display name', type: 'text' },
    { name: 'email', placeholder: 'Email', type: 'email' },
    { name: 'password', placeholder: 'Password (min 8 chars)', type: 'password' },
    { name: 'age', placeholder: 'Age (must be 18+)', type: 'number' },
    { name: 'phone', placeholder: 'WhatsApp number (optional)', type: 'tel' },
  ]

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Create your account</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {fields.map(f => (
        <input key={f.name} type={f.type} placeholder={f.placeholder} required={f.name !== 'phone'}
          value={form[f.name as keyof typeof form]}
          onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
      ))}
      <button type="submit" disabled={loading}
        className="bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition">
        {loading ? 'Creating account...' : 'Join ZuriX'}
      </button>
      <p className="text-zinc-500 text-sm text-center">
        Already have an account? <Link href="/login" className="text-amber-500">Sign in</Link>
      </p>
      <p className="text-zinc-600 text-xs text-center">By joining you confirm you are 18+ and agree to our terms.</p>
    </form>
  )
}

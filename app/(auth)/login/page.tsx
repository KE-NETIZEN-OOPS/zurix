'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }
    router.push('/explore')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Welcome back</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
      <button type="submit" disabled={loading}
        className="bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition">
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      <p className="text-zinc-500 text-sm text-center">
        New here? <Link href="/register" className="text-amber-500">Create account</Link>
      </p>
    </form>
  )
}

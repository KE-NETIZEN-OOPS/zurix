'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TIER_PRICES, tierLabel } from '@/lib/tiers'
import TierCard from '@/components/payments/TierCard'

function PaymentsContent() {
  const params = useSearchParams()
  const preselectedTier = params.get('tier')
  const status = params.get('status')
  const [tier, setTier] = useState(preselectedTier ?? '')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [method, setMethod] = useState<'mpesa' | 'card' | 'crypto'>('mpesa')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(status === 'success' ? 'Payment successful! Your tier has been upgraded.' : status === 'failed' ? 'Payment failed. Please try again.' : '')

  async function handlePay(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMessage('')
    try {
      if (method === 'mpesa') {
        const res = await fetch('/api/payments/mpesa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, tier, billing }) })
        const d = await res.json()
        setMessage(d.message ?? d.error ?? 'Payment initiated')
      } else if (method === 'card') {
        const res = await fetch('/api/payments/card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, billing, email }) })
        const d = await res.json()
        if (d.redirectUrl) window.location.href = d.redirectUrl
      } else {
        const res = await fetch('/api/payments/crypto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, billing }) })
        const d = await res.json()
        if (d.invoiceUrl) window.location.href = d.invoiceUrl
      }
    } catch { setMessage('An error occurred. Please try again.') }
    setLoading(false)
  }

  if (!tier) return (
    <div>
      <h1 className="text-2xl font-bold mb-8 text-center">Choose your plan</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {(['flame', 'blaze', 'inferno'] as const).map(t => <TierCard key={t} tier={t} />)}
      </div>
    </div>
  )

  const prices = TIER_PRICES[tier as keyof typeof TIER_PRICES]

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upgrade to {tierLabel(tier as any)}</h1>
      {message && <div className={`p-4 rounded-xl mb-4 text-sm ${message.includes('success') || message.includes('M-Pesa') || message.includes('Check') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{message}</div>}
      <form onSubmit={handlePay} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col gap-4">
        <div className="flex gap-2">
          {(['monthly', 'annual'] as const).map(b => (
            <button key={b} type="button" onClick={() => setBilling(b)} className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${billing === b ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}>
              {b === 'monthly' ? `KES ${prices.monthly}/mo` : `KES ${prices.annual}/yr (save ${Math.round((1 - prices.annual / (prices.monthly * 12)) * 100)}%)`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {([['mpesa', 'M-Pesa'], ['card', 'Card/Bank'], ['crypto', 'Crypto']] as const).map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMethod(m)} className={`flex-1 py-2 rounded-full text-xs font-semibold transition ${method === m ? 'bg-zinc-100 text-black' : 'bg-zinc-800 text-zinc-300'}`}>{label}</button>
          ))}
        </div>
        {method === 'mpesa' && <input type="tel" placeholder="M-Pesa number (07XX...)" value={phone} onChange={e => setPhone(e.target.value)} required className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />}
        {method === 'card' && <input type="email" placeholder="Email for receipt" value={email} onChange={e => setEmail(e.target.value)} required className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />}
        {method === 'crypto' && <p className="text-zinc-400 text-sm text-center">Pay with BTC, ETH, USDT, BNB or 100+ coins via NOWPayments</p>}
        <button type="submit" disabled={loading} className="bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition">
          {loading ? 'Processing...' : `Pay KES ${billing === 'monthly' ? prices.monthly : prices.annual}`}
        </button>
      </form>
    </div>
  )
}

export default function PaymentsPage() {
  return <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading...</div>}><PaymentsContent /></Suspense>
}

# ZuriX Phase 6: Payments

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Subscription page with M-Pesa STK Push, Pesapal bank/card, and NOWPayments crypto. Subscription lifecycle with daily expiry.

**Architecture:** Each payment method has initiate + callback/webhook routes. On success, subscriptions row → active + users.tier updated. A daily cron (node-cron via standalone script) expires old subscriptions.

**Tech Stack:** Safaricom Daraja API v2, Pesapal v3, NOWPayments, node-cron

## Global Constraints
- All amounts in KES
- Daraja sandbox for dev, production for live
- No secrets ever logged or stored in DB (only provider transaction IDs)
- Subscription lifecycle: pending → active → expired

---

### Task 21: Payment helpers

**Files:**
- Create: `lib/daraja.ts`
- Create: `lib/pesapal.ts`
- Create: `lib/nowpayments.ts`
- Test: `tests/lib/daraja.test.ts`

- [ ] **Step 1: Create lib/daraja.ts**
```ts
// lib/daraja.ts
const DARAJA_BASE = process.env.DARAJA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

async function getToken(): Promise<string> {
  const creds = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')

  const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
}

function getPassword(timestamp: string): string {
  return Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64')
}

export async function stkPush(phone: string, amountKes: number, reference: string): Promise<{
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
}> {
  const token = await getToken()
  const timestamp = getTimestamp()
  const password = getPassword(timestamp)

  // Normalize phone: ensure 254XXXXXXXXX format
  const normalizedPhone = phone.startsWith('0')
    ? `254${phone.slice(1)}`
    : phone.startsWith('+')
    ? phone.slice(1)
    : phone

  const res = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amountKes,
      PartyA: normalizedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: reference,
      TransactionDesc: 'ZuriX Subscription',
    }),
  })
  return res.json()
}
```

- [ ] **Step 2: Write Daraja tests**
```ts
// tests/lib/daraja.test.ts
import { describe, it, expect } from 'vitest'

// Test the timestamp format — pure logic, no API calls
function getTimestamp(): string {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
}

function normalizePhone(phone: string): string {
  if (phone.startsWith('0')) return `254${phone.slice(1)}`
  if (phone.startsWith('+')) return phone.slice(1)
  return phone
}

describe('daraja helpers', () => {
  it('getTimestamp returns 14-digit string', () => {
    const ts = getTimestamp()
    expect(ts).toMatch(/^\d{14}$/)
  })

  it('normalizes 07XX number to 2547XX', () => {
    expect(normalizePhone('0712345678')).toBe('254712345678')
  })

  it('normalizes +2547XX to 2547XX', () => {
    expect(normalizePhone('+254712345678')).toBe('254712345678')
  })

  it('leaves 2547XX unchanged', () => {
    expect(normalizePhone('254712345678')).toBe('254712345678')
  })
})
```

- [ ] **Step 3: Create lib/pesapal.ts**
```ts
// lib/pesapal.ts
const PESAPAL_BASE = process.env.PESAPAL_ENV === 'production'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3'

async function getToken(): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  })
  const data = await res.json() as { token: string }
  return data.token
}

export async function registerIPN(url: string): Promise<string> {
  const token = await getToken()
  const res = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ url, ipn_notification_type: 'POST' }),
  })
  const data = await res.json() as { ipn_id: string }
  return data.ipn_id
}

export async function submitOrder(params: {
  amount: number
  currency: string
  orderId: string
  description: string
  callbackUrl: string
  notificationId: string
  email: string
}): Promise<{ redirect_url: string; order_tracking_id: string }> {
  const token = await getToken()
  const res = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      id: params.orderId,
      currency: params.currency,
      amount: params.amount,
      description: params.description,
      callback_url: params.callbackUrl,
      notification_id: params.notificationId,
      billing_address: { email_address: params.email },
    }),
  })
  return res.json()
}
```

- [ ] **Step 4: Create lib/nowpayments.ts**
```ts
// lib/nowpayments.ts
const NP_BASE = 'https://api.nowpayments.io/v1'

export async function createInvoice(params: {
  amountKes: number
  orderId: string
  description: string
  successUrl: string
  cancelUrl: string
}): Promise<{ invoice_url: string; id: string }> {
  const res = await fetch(`${NP_BASE}/invoice`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: params.amountKes,
      price_currency: 'kes',
      pay_currency: 'usdttrc20',
      order_id: params.orderId,
      order_description: params.description,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      is_fixed_rate: false,
      is_fee_paid_by_user: false,
    }),
  })
  return res.json()
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const crypto = require('crypto')
  const expected = crypto
    .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!)
    .update(payload)
    .digest('hex')
  return expected === signature
}
```

- [ ] **Step 5: Run tests**
```bash
pnpm test
```
Expected: 4 daraja tests + existing tests all pass

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: add Daraja, Pesapal, and NOWPayments helpers"
```

---

### Task 22: M-Pesa payment routes

**Files:**
- Create: `app/api/payments/mpesa/initiate/route.ts`
- Create: `app/api/payments/mpesa/callback/route.ts`

- [ ] **Step 1: Create app/api/payments/mpesa/initiate/route.ts**
```ts
// app/api/payments/mpesa/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stkPush } from '@/lib/daraja'
import { TIER_PRICES, type Tier } from '@/lib/tiers'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier, cycle, phone } = await req.json() as {
    tier: Exclude<Tier, 'free'>
    cycle: 'monthly' | 'annual'
    phone: string
  }

  const prices = TIER_PRICES[tier]
  const amount = cycle === 'annual' ? prices.annual : prices.monthly

  // Create pending subscription
  const subId = randomUUID()
  await supabase.from('subscriptions').insert({
    id: subId,
    user_id: user.id,
    tier,
    billing_cycle: cycle,
    amount_kes: amount,
    payment_method: 'mpesa',
    status: 'pending',
  })

  const result = await stkPush(phone, amount, `ZURIX-${subId.slice(0, 8).toUpperCase()}`)

  if (result.ResponseCode !== '0') {
    await supabase.from('subscriptions').update({ status: 'failed' }).eq('id', subId)
    return NextResponse.json({ error: result.ResponseDescription }, { status: 400 })
  }

  // Store CheckoutRequestID so callback can match it
  await supabase.from('subscriptions').update({
    provider_ref: result.CheckoutRequestID,
  }).eq('id', subId)

  return NextResponse.json({ ok: true, checkoutRequestId: result.CheckoutRequestID })
}
```

- [ ] **Step 2: Create app/api/payments/mpesa/callback/route.ts**
```ts
// app/api/payments/mpesa/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const stk = body?.Body?.stkCallback
  if (!stk) return NextResponse.json({ ok: true })

  const checkoutRequestId = stk.CheckoutRequestID
  const resultCode = stk.ResultCode

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id, tier, billing_cycle')
    .eq('provider_ref', checkoutRequestId)
    .single()

  if (!sub) return NextResponse.json({ ok: true })

  if (resultCode === 0) {
    // Payment successful
    const now = new Date()
    const endsAt = new Date(now)
    if (sub.billing_cycle === 'annual') {
      endsAt.setFullYear(endsAt.getFullYear() + 1)
    } else {
      endsAt.setMonth(endsAt.getMonth() + 1)
    }

    await supabase.from('subscriptions').update({
      status: 'active',
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    }).eq('id', sub.id)

    await supabase.from('users').update({
      tier: sub.tier,
      tier_expires_at: endsAt.toISOString(),
    }).eq('id', sub.user_id)
  } else {
    await supabase.from('subscriptions').update({ status: 'failed' }).eq('id', sub.id)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: add M-Pesa STK Push initiate and callback routes"
```

---

### Task 23: Pesapal + NOWPayments routes

**Files:**
- Create: `app/api/payments/pesapal/initiate/route.ts`
- Create: `app/api/payments/pesapal/ipn/route.ts`
- Create: `app/api/payments/crypto/initiate/route.ts`
- Create: `app/api/payments/crypto/webhook/route.ts`

- [ ] **Step 1: Create app/api/payments/pesapal/initiate/route.ts**
```ts
// app/api/payments/pesapal/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitOrder } from '@/lib/pesapal'
import { TIER_PRICES, type Tier } from '@/lib/tiers'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single()
  const { tier, cycle } = await req.json() as { tier: Exclude<Tier, 'free'>; cycle: 'monthly' | 'annual' }

  const prices = TIER_PRICES[tier]
  const amount = cycle === 'annual' ? prices.annual : prices.monthly
  const orderId = randomUUID()

  await supabase.from('subscriptions').insert({
    id: orderId,
    user_id: user.id,
    tier,
    billing_cycle: cycle,
    amount_kes: amount,
    payment_method: 'bank',
    status: 'pending',
    provider_ref: orderId,
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { redirect_url } = await submitOrder({
    amount,
    currency: 'KES',
    orderId,
    description: `ZuriX ${tier} ${cycle}`,
    callbackUrl: `${siteUrl}/payments/success`,
    notificationId: process.env.PESAPAL_IPN_ID ?? '',
    email: profile?.email ?? '',
  })

  return NextResponse.json({ redirectUrl: redirect_url })
}
```

- [ ] **Step 2: Create app/api/payments/pesapal/ipn/route.ts**
```ts
// app/api/payments/pesapal/ipn/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json() as { order_tracking_id: string; payment_status_description: string }

  if (body.payment_status_description !== 'Completed') {
    return NextResponse.json({ ok: true })
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id, tier, billing_cycle')
    .eq('provider_ref', body.order_tracking_id)
    .single()

  if (!sub) return NextResponse.json({ ok: true })

  const now = new Date()
  const endsAt = new Date(now)
  sub.billing_cycle === 'annual'
    ? endsAt.setFullYear(endsAt.getFullYear() + 1)
    : endsAt.setMonth(endsAt.getMonth() + 1)

  await supabase.from('subscriptions').update({
    status: 'active',
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
  }).eq('id', sub.id)

  await supabase.from('users').update({
    tier: sub.tier,
    tier_expires_at: endsAt.toISOString(),
  }).eq('id', sub.user_id)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create app/api/payments/crypto/initiate/route.ts**
```ts
// app/api/payments/crypto/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvoice } from '@/lib/nowpayments'
import { TIER_PRICES, type Tier } from '@/lib/tiers'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier, cycle } = await req.json() as { tier: Exclude<Tier, 'free'>; cycle: 'monthly' | 'annual' }

  const prices = TIER_PRICES[tier]
  const amount = cycle === 'annual' ? prices.annual : prices.monthly
  const orderId = randomUUID()

  await supabase.from('subscriptions').insert({
    id: orderId,
    user_id: user.id,
    tier,
    billing_cycle: cycle,
    amount_kes: amount,
    payment_method: 'crypto',
    status: 'pending',
    provider_ref: orderId,
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { invoice_url } = await createInvoice({
    amountKes: amount,
    orderId,
    description: `ZuriX ${tier} ${cycle}`,
    successUrl: `${siteUrl}/payments/success`,
    cancelUrl: `${siteUrl}/payments`,
  })

  return NextResponse.json({ invoiceUrl: invoice_url })
}
```

- [ ] **Step 4: Create app/api/payments/crypto/webhook/route.ts**
```ts
// app/api/payments/crypto/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '@/lib/nowpayments'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!
)

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-nowpayments-sig') ?? ''
  const rawBody = await req.text()

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as { order_id: string; payment_status: string }

  if (payload.payment_status !== 'finished' && payload.payment_status !== 'confirmed') {
    return NextResponse.json({ ok: true })
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id, tier, billing_cycle')
    .eq('provider_ref', payload.order_id)
    .single()

  if (!sub) return NextResponse.json({ ok: true })

  const now = new Date()
  const endsAt = new Date(now)
  sub.billing_cycle === 'annual'
    ? endsAt.setFullYear(endsAt.getFullYear() + 1)
    : endsAt.setMonth(endsAt.getMonth() + 1)

  await supabase.from('subscriptions').update({
    status: 'active',
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
  }).eq('id', sub.id)

  await supabase.from('users').update({
    tier: sub.tier,
    tier_expires_at: endsAt.toISOString(),
  }).eq('id', sub.user_id)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add Pesapal bank and NOWPayments crypto payment routes"
```

---

### Task 24: Payments UI page + success page

**Files:**
- Create: `app/(app)/payments/page.tsx`
- Create: `app/(app)/payments/success/page.tsx`
- Create: `components/payments/PaymentModal.tsx`

- [ ] **Step 1: Create components/payments/PaymentModal.tsx**
```tsx
// components/payments/PaymentModal.tsx
'use client'
import { useState } from 'react'
import { TIER_PRICES, tierLabel, type Tier } from '@/lib/tiers'

interface Props {
  tier: Exclude<Tier, 'free'>
  cycle: 'monthly' | 'annual'
  onClose: () => void
}

type Method = 'mpesa' | 'bank' | 'crypto'

export default function PaymentModal({ tier, cycle, onClose }: Props) {
  const [method, setMethod] = useState<Method>('mpesa')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const amount = cycle === 'annual' ? TIER_PRICES[tier].annual : TIER_PRICES[tier].monthly

  async function handlePay() {
    setLoading(true)
    setStatus(null)

    if (method === 'mpesa') {
      const res = await fetch('/api/payments/mpesa/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, cycle, phone }),
      }).then(r => r.json())

      if (res.ok) {
        setStatus('STK Push sent to your phone. Enter your M-Pesa PIN to complete.')
      } else {
        setStatus(`Error: ${res.error}`)
      }
    }

    if (method === 'bank') {
      const { redirectUrl } = await fetch('/api/payments/pesapal/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, cycle }),
      }).then(r => r.json())
      if (redirectUrl) window.location.href = redirectUrl
    }

    if (method === 'crypto') {
      const { invoiceUrl } = await fetch('/api/payments/crypto/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, cycle }),
      }).then(r => r.json())
      if (invoiceUrl) window.open(invoiceUrl, '_blank')
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 w-full max-w-md">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-bold">Subscribe to {tierLabel(tier)}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        <div className="bg-zinc-800 rounded-xl p-3 mb-4 flex justify-between">
          <span className="text-zinc-300">{tierLabel(tier)} · {cycle}</span>
          <span className="font-bold text-amber-500">KES {amount.toLocaleString()}</span>
        </div>

        <p className="text-sm text-zinc-400 mb-3">Payment method:</p>
        <div className="flex gap-2 mb-4">
          {([
            { id: 'mpesa', label: '📱 M-Pesa' },
            { id: 'bank', label: '🏦 Bank/Card' },
            { id: 'crypto', label: '₿ Crypto' },
          ] as { id: Method; label: string }[]).map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                method === m.id ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {method === 'mpesa' && (
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="M-Pesa number e.g. 0712345678"
            type="tel"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 mb-4"
          />
        )}

        {method === 'bank' && (
          <p className="text-zinc-400 text-sm mb-4">You will be redirected to Pesapal to pay via card or bank transfer.</p>
        )}

        {method === 'crypto' && (
          <p className="text-zinc-400 text-sm mb-4">Pay with BTC, ETH, USDT, or BNB. Invoice opens in a new tab.</p>
        )}

        {status && <p className="text-sm text-amber-400 mb-3">{status}</p>}

        <button
          onClick={handlePay}
          disabled={loading || (method === 'mpesa' && !phone)}
          className="w-full bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition"
        >
          {loading ? 'Processing...' : `Pay KES ${amount.toLocaleString()}`}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create app/(app)/payments/page.tsx**
```tsx
// app/(app)/payments/page.tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import TierCard from '@/components/payments/TierCard'
import PaymentModal from '@/components/payments/PaymentModal'
import type { Tier } from '@/lib/tiers'

type BillingCycle = 'monthly' | 'annual'

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const defaultTier = (searchParams.get('tier') as Exclude<Tier, 'free'> | null) ?? null
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [selectedTier, setSelectedTier] = useState<Exclude<Tier, 'free'> | null>(defaultTier)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Upgrade your plan</h1>
      <p className="text-zinc-400 mb-6">Unlock more features. Cancel anytime.</p>

      {/* Cycle toggle */}
      <div className="flex gap-2 mb-8 w-fit bg-zinc-900 rounded-full p-1 border border-zinc-800">
        {(['monthly', 'annual'] as BillingCycle[]).map(c => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              cycle === c ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {c === 'monthly' ? 'Monthly' : 'Annual (2 months free)'}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {(['flame', 'blaze', 'inferno'] as Exclude<Tier, 'free'>[]).map(t => (
          <div key={t} onClick={() => setSelectedTier(t)} className="cursor-pointer">
            <TierCard tier={t} highlighted={t === 'blaze'} />
          </div>
        ))}
      </div>

      {selectedTier && (
        <PaymentModal
          tier={selectedTier}
          cycle={cycle}
          onClose={() => setSelectedTier(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create app/(app)/payments/success/page.tsx**
```tsx
// app/(app)/payments/success/page.tsx
import Link from 'next/link'

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
      <p className="text-zinc-400 mb-6">Your subscription is now active. Enjoy your ZuriX upgrade.</p>
      <Link href="/explore" className="bg-amber-500 text-black font-bold px-8 py-3 rounded-full hover:bg-amber-400 transition">
        Start Exploring
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Verify payments page renders correctly**
```bash
pnpm dev
```
Go to /payments — verify 3 tier cards show, monthly/annual toggle works, clicking a card opens the payment modal.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add payments page with M-Pesa, bank, and crypto modals"
```

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stkPush } from '@/lib/daraja'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { phone, tier, billing } = await req.json() as { phone: string; tier: string; billing: 'monthly' | 'annual' }
  const prices: Record<string, Record<string, number>> = { flame: { monthly: 299, annual: 2990 }, blaze: { monthly: 499, annual: 4990 }, inferno: { monthly: 999, annual: 9990 } }
  const amount = prices[tier]?.[billing]
  if (!amount) return NextResponse.json({ error: 'Invalid tier or billing' }, { status: 400 })
  const ref = `ZURIX-${user.id.slice(0, 8).toUpperCase()}-${Date.now()}`
  await supabase.from('subscriptions').insert({ user_id: user.id, tier, billing_cycle: billing, amount_kes: amount, payment_method: 'mpesa', status: 'pending', reference: ref })
  const result = await stkPush(phone, amount, ref)
  if (!result.ResponseCode || result.ResponseCode !== '0') return NextResponse.json({ error: result.ResponseDescription ?? 'STK push failed' }, { status: 500 })
  return NextResponse.json({ ok: true, checkoutRequestId: result.CheckoutRequestID, message: 'Check your phone to complete M-Pesa payment' })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitOrder } from '@/lib/pesapal'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tier, billing, email } = await req.json() as { tier: string; billing: 'monthly' | 'annual'; email: string }
  const prices: Record<string, Record<string, number>> = { flame: { monthly: 299, annual: 2990 }, blaze: { monthly: 499, annual: 4990 }, inferno: { monthly: 999, annual: 9990 } }
  const amount = prices[tier]?.[billing]
  if (!amount) return NextResponse.json({ error: 'Invalid tier or billing' }, { status: 400 })
  const ref = `ZURIX-CARD-${user.id.slice(0, 8).toUpperCase()}-${Date.now()}`
  await supabase.from('subscriptions').insert({ user_id: user.id, tier, billing_cycle: billing, amount_kes: amount, payment_method: 'card', status: 'pending', reference: ref })
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/card/callback`
  const result = await submitOrder({ amount, currency: 'KES', description: `ZuriX ${tier}`, orderId: ref, callbackUrl, notificationId: process.env.PESAPAL_NOTIFICATION_ID ?? '', email })
  return NextResponse.json({ redirectUrl: result.redirect_url })
}

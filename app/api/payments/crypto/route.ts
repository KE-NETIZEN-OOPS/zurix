import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvoice } from '@/lib/nowpayments'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tier, billing } = await req.json() as { tier: string; billing: 'monthly' | 'annual' }
  const prices: Record<string, Record<string, number>> = { flame: { monthly: 299, annual: 2990 }, blaze: { monthly: 499, annual: 4990 }, inferno: { monthly: 999, annual: 9990 } }
  const amount = prices[tier]?.[billing]
  if (!amount) return NextResponse.json({ error: 'Invalid tier or billing' }, { status: 400 })
  const ref = `ZURIX-CRYPTO-${user.id.slice(0, 8).toUpperCase()}-${Date.now()}`
  await supabase.from('subscriptions').insert({ user_id: user.id, tier, billing_cycle: billing, amount_kes: amount, payment_method: 'crypto', status: 'pending', reference: ref })
  const invoice = await createInvoice({ amountKes: amount, orderId: ref, description: `ZuriX ${tier} subscription`, successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payments?status=success`, cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payments?tier=${tier}` })
  return NextResponse.json({ invoiceUrl: invoice.invoice_url })
}

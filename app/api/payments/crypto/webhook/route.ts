import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/nowpayments'

export async function POST(req: NextRequest) {
  const sig = req.headers.get('x-nowpayments-sig') ?? ''
  const body = await req.text()
  if (!verifyWebhookSignature(body, sig)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  const data = JSON.parse(body)
  if (data.payment_status === 'finished' || data.payment_status === 'confirmed') {
    const ref = data.order_id
    const supabase = createAdminClient()
    const { data: sub } = await supabase.from('subscriptions').select('user_id, tier').eq('reference', ref).single()
    if (sub) {
      await supabase.from('subscriptions').update({ status: 'active', activated_at: new Date().toISOString() }).eq('reference', ref)
      await supabase.from('users').update({ tier: sub.tier }).eq('id', sub.user_id)
    }
  }
  return NextResponse.json({ ok: true })
}

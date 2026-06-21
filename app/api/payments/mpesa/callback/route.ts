import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = body?.Body?.stkCallback
  if (!result) return NextResponse.json({ ok: true })
  const ref = result.MerchantRequestID ?? ''
  const supabase = createAdminClient()
  if (result.ResultCode === 0) {
    const sub = await supabase.from('subscriptions').select('user_id, tier').eq('reference', ref).single()
    if (sub.data) {
      await supabase.from('subscriptions').update({ status: 'active', activated_at: new Date().toISOString() }).eq('reference', ref)
      await supabase.from('users').update({ tier: sub.data.tier }).eq('id', sub.data.user_id)
    }
  } else {
    await supabase.from('subscriptions').update({ status: 'failed' }).eq('reference', ref)
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('OrderMerchantReference') ?? ''
  const status = req.nextUrl.searchParams.get('OrderPaymentStatus') ?? ''
  const supabase = createAdminClient()
  if (status === 'COMPLETED') {
    const { data: sub } = await supabase.from('subscriptions').select('user_id, tier').eq('reference', ref).single()
    if (sub) {
      await supabase.from('subscriptions').update({ status: 'active', activated_at: new Date().toISOString() }).eq('reference', ref)
      await supabase.from('users').update({ tier: sub.tier }).eq('id', sub.user_id)
    }
  } else {
    await supabase.from('subscriptions').update({ status: 'failed' }).eq('reference', ref)
  }
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payments?status=${status === 'COMPLETED' ? 'success' : 'failed'}`)
}

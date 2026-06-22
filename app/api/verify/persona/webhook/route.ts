import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyWebhook } from '@/lib/persona'

// Persona server-to-server webhook. On inquiry.approved/completed, grant the tick.
export async function POST(req: NextRequest) {
  const raw = await req.text()
  const sig = req.headers.get('persona-signature')
  if (!verifyWebhook(raw, sig)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  const body = JSON.parse(raw)
  const eventName = body?.data?.attributes?.name ?? ''
  const payloadAttr = body?.data?.attributes?.payload?.data?.attributes ?? {}
  const referenceId = payloadAttr['reference-id']
  const status = payloadAttr.status

  if (referenceId && (eventName === 'inquiry.approved' || eventName === 'inquiry.completed' || ['approved', 'completed'].includes(status))) {
    const supabase = createAdminClient()
    await supabase.from('users').update({ is_verified: true, verified_via: 'persona' }).eq('id', referenceId)
  }
  return NextResponse.json({ ok: true })
}

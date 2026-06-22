import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInquiry, personaConfigured } from '@/lib/persona'

// Called by the client after the Persona flow completes. Confirms the
// inquiry server-side and grants the verified tick.
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!personaConfigured()) return NextResponse.json({ error: 'Persona not configured' }, { status: 400 })

  const { inquiryId } = await req.json() as { inquiryId: string }
  const inquiry = await getInquiry(inquiryId)
  if (!inquiry) return NextResponse.json({ error: 'Could not verify inquiry' }, { status: 400 })
  if (inquiry.referenceId && inquiry.referenceId !== user.id) return NextResponse.json({ error: 'Mismatched inquiry' }, { status: 403 })

  const ok = ['completed', 'approved'].includes(inquiry.status)
  if (!ok) return NextResponse.json({ verified: false, status: inquiry.status })

  await supabase.from('users').update({ is_verified: true, verified_via: 'persona', persona_inquiry_id: inquiryId }).eq('id', user.id)
  return NextResponse.json({ verified: true })
}

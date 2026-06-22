import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasAccess, type Tier } from '@/lib/tiers'

// Create a phone-number request to another user
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('users').select('tier, is_verified').eq('id', user.id).single()
  if (!me?.is_verified) return NextResponse.json({ error: 'Verify your profile first (add a profile photo).' }, { status: 403 })
  if (!hasAccess((me.tier as Tier) ?? 'free', 'flame')) return NextResponse.json({ error: 'A paid tier is required to request numbers.' }, { status: 403 })
  const { targetId } = await req.json() as { targetId: string }
  if (targetId === user.id) return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  const { data, error } = await supabase
    .from('phone_requests')
    .upsert({ requester_id: user.id, target_id: targetId, status: 'pending', responded_at: null }, { onConflict: 'requester_id,target_id' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data })
}

// List requests (incoming for me to respond to, or status with a specific user)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const withUser = req.nextUrl.searchParams.get('with')

  if (withUser) {
    // Status of request between me (requester) and withUser (target), plus reverse
    const { data: outgoing } = await supabase.from('phone_requests').select('status').eq('requester_id', user.id).eq('target_id', withUser).maybeSingle()
    const { data: incoming } = await supabase.from('phone_requests').select('id, status').eq('requester_id', withUser).eq('target_id', user.id).maybeSingle()
    let theirPhone: string | null = null
    if (outgoing?.status === 'accepted') {
      const { data: t } = await supabase.from('users').select('phone').eq('id', withUser).single()
      theirPhone = t?.phone ?? null
    }
    return NextResponse.json({ outgoing: outgoing?.status ?? null, incoming: incoming ?? null, theirPhone })
  }

  // All incoming pending requests for me
  const { data } = await supabase
    .from('phone_requests')
    .select('id, status, created_at, users!requester_id(id, username, display_name, avatar_url)')
    .eq('target_id', user.id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ requests: data ?? [] })
}

// Respond to a request (accept / decline)
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { requestId, action } = await req.json() as { requestId: string; action: 'accept' | 'decline' }
  const status = action === 'accept' ? 'accepted' : 'declined'
  const { error } = await supabase
    .from('phone_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('target_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}

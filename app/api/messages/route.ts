import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasAccess, DM_LIMITS, type Tier } from '@/lib/tiers'

function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Quota status for the UI
  if (req.nextUrl.searchParams.get('quota')) {
    const { data: me } = await supabase.from('users').select('tier, is_verified').eq('id', user.id).single()
    const tier = (me?.tier as Tier) ?? 'free'
    const limits = DM_LIMITS[tier]
    const { count: messagesToday } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', user.id).gte('created_at', startOfToday())
    const { data: todays } = await supabase.from('messages').select('receiver_id').eq('sender_id', user.id).gte('created_at', startOfToday())
    const newChatsToday = new Set((todays ?? []).map((t: { receiver_id: string }) => t.receiver_id)).size
    return NextResponse.json({
      tier,
      verified: me?.is_verified ?? false,
      messagesToday: messagesToday ?? 0,
      newChatsToday,
      limits: {
        newChatsPerDay: limits.newChatsPerDay === Infinity ? null : limits.newChatsPerDay,
        messagesPerDay: limits.messagesPerDay === Infinity ? null : limits.messagesPerDay,
      },
    })
  }

  const otherId = req.nextUrl.searchParams.get('with')
  if (!otherId) {
    const { data } = await supabase.from('messages').select('id, content, created_at, sender_id, receiver_id, users!sender_id(username, display_name, avatar_url)').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(80)
    const threads: Record<string, any> = {}
    for (const m of data ?? []) {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id
      if (!threads[other]) threads[other] = m
    }
    return NextResponse.json({ threads: Object.values(threads) })
  }
  const { data } = await supabase.from('messages').select('id, content, created_at, sender_id, receiver_id').or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`).order('created_at', { ascending: true }).limit(200)
  const { data: other } = await supabase.from('users').select('id, username, display_name, avatar_url, is_verified').eq('id', otherId).single()
  return NextResponse.json({ messages: data ?? [], other: other ?? null })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('users').select('tier, is_verified').eq('id', user.id).single()
  const tier = (me?.tier as Tier) ?? 'free'

  if (!me?.is_verified) return NextResponse.json({ error: 'Verify your profile first (add a profile photo) to send messages.' }, { status: 403 })
  if (!hasAccess(tier, 'flame')) return NextResponse.json({ error: 'A paid tier (Flame+) is required to send messages.' }, { status: 403 })

  const { receiverId, content } = await req.json() as { receiverId: string; content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const limits = DM_LIMITS[tier]

  // Daily total messages cap
  if (limits.messagesPerDay !== Infinity) {
    const { count: msgsToday } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', user.id).gte('created_at', startOfToday())
    if ((msgsToday ?? 0) >= limits.messagesPerDay) {
      return NextResponse.json({ error: `Daily message limit reached (${limits.messagesPerDay}). Upgrade for more.` }, { status: 429 })
    }
  }

  // New-conversation cap (only when this is a brand-new chat)
  if (limits.newChatsPerDay !== Infinity) {
    const { count: existing } = await supabase.from('messages').select('*', { count: 'exact', head: true }).or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    const isNewChat = (existing ?? 0) === 0
    if (isNewChat) {
      const { data: todays } = await supabase.from('messages').select('receiver_id').eq('sender_id', user.id).gte('created_at', startOfToday())
      const distinct = new Set((todays ?? []).map((t: { receiver_id: string }) => t.receiver_id))
      if (distinct.size >= limits.newChatsPerDay) {
        return NextResponse.json({ error: `Daily new-conversation limit reached (${limits.newChatsPerDay}). Upgrade for more.` }, { status: 429 })
      }
    }
  }

  const { data, error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: receiverId, content }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}

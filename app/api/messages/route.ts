import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const otherId = req.nextUrl.searchParams.get('with')
  if (!otherId) {
    const { data } = await supabase.from('messages').select('id, content, created_at, sender_id, receiver_id, users!sender_id(username, display_name, avatar_url)').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(50)
    const threads: Record<string, any> = {}
    for (const m of data ?? []) {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id
      if (!threads[other]) threads[other] = m
    }
    return NextResponse.json({ threads: Object.values(threads) })
  }
  const { data } = await supabase.from('messages').select('id, content, created_at, sender_id, receiver_id').or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`).order('created_at', { ascending: true }).limit(100)
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tier').eq('id', user.id).single()
  const tierRank: Record<string, number> = { free: 0, flame: 1, blaze: 2, inferno: 3 }
  if ((tierRank[profile?.tier ?? 'free'] ?? 0) < 1) return NextResponse.json({ error: 'Flame tier required for DMs' }, { status: 403 })
  const { receiverId, content } = await req.json() as { receiverId: string; content: string }
  const { data, error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: receiverId, content }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}

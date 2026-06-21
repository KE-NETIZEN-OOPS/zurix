import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('users').select('id, username, display_name, avatar_url, tier, bio, gender, age, location_city, interests, looking_for, hide_data, phone, is_verified').eq('id', user.id).single()
  return NextResponse.json(data ?? {})
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const allowed = ['display_name', 'bio', 'gender', 'location_city', 'interests', 'looking_for', 'hide_data', 'avatar_url', 'phone']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) { if (key in body) updates[key] = body[key] }
  const { data, error } = await supabase.from('users').update(updates).eq('id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ? supabase : null
}

export async function GET() {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await supabase.from('adult_videos').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ videos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { data, error } = await supabase.from('adult_videos').insert({ ...body, is_active: true }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ video: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json() as { id: string }
  await supabase.from('adult_videos').update({ is_active: false }).eq('id', id)
  return NextResponse.json({ ok: true })
}

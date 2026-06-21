import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tier').eq('id', user.id).single()
  const tierRank: Record<string, number> = { free: 0, flame: 1, blaze: 2, inferno: 3 }
  if ((tierRank[profile?.tier ?? 'free'] ?? 0) < 2) return NextResponse.json({ error: 'Upgrade to Blaze to access adult videos' }, { status: 403 })
  const { data, error } = await supabase.from('adult_videos').select('id, title, embed_url, thumbnail_url, duration_secs, tags').eq('is_active', true).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ videos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { data, error } = await supabase.from('adult_videos').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ video: data })
}

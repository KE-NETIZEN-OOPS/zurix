import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tier').eq('id', user.id).single()
  const tierRank: Record<string, number> = { free: 0, flame: 1, blaze: 2, inferno: 3 }
  if ((tierRank[profile?.tier ?? 'free'] ?? 0) < 2) return NextResponse.json({ error: 'Blaze tier required' }, { status: 403 })
  const { data } = await supabase.from('posts').select('id, caption, media_urls, likes_count, created_at, users!user_id(id, username, display_name, avatar_url)').eq('is_spicy', true).order('created_at', { ascending: false }).limit(30)
  return NextResponse.json({ posts: data ?? [] })
}

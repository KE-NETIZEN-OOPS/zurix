import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
  const ids = [...(follows ?? []).map((f: { following_id: string }) => f.following_id), user.id]
  const { data } = await supabase.from('stories').select('id, media_url, media_type, music_url, music_title, caption, expires_at, created_at, user_id, users!user_id(username, display_name, avatar_url)').in('user_id', ids).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })
  return NextResponse.json({ stories: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { mediaUrl, mediaType, musicUrl, musicTitle, caption } = await req.json() as { mediaUrl: string; mediaType?: string; musicUrl?: string; musicTitle?: string; caption?: string }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('stories').insert({ user_id: user.id, media_url: mediaUrl, media_type: mediaType ?? 'image', music_url: musicUrl ?? null, music_title: musicTitle ?? null, caption: caption ?? null, expires_at: expiresAt }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ story: data })
}

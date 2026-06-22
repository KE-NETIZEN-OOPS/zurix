import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SELECT = 'id, caption, media_urls, media_type, music_url, music_title, is_spicy, likes_count, created_at, users!user_id(id, username, display_name, avatar_url, is_verified)'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const feed = req.nextUrl.searchParams.get('feed') === 'following'
  let query = supabase.from('posts').select(SELECT).eq('is_spicy', false).order('created_at', { ascending: false }).limit(30)
  if (feed) {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    const ids = [...(follows ?? []).map((f: { following_id: string }) => f.following_id), user.id]
    query = query.in('user_id', ids)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { caption, mediaUrls, isSpicy, mediaType, musicUrl, musicTitle } = await req.json() as { caption: string; mediaUrls: string[]; isSpicy: boolean; mediaType?: string; musicUrl?: string; musicTitle?: string }
  const { data, error } = await supabase.from('posts').insert({
    user_id: user.id, caption, media_urls: mediaUrls, is_spicy: isSpicy ?? false,
    media_type: mediaType ?? 'image', music_url: musicUrl ?? null, music_title: musicTitle ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const feed = req.nextUrl.searchParams.get('feed') === 'following'
  let query = supabase.from('posts').select('id, caption, media_urls, is_spicy, likes_count, created_at, users!user_id(id, username, display_name, avatar_url, is_verified)').eq('is_spicy', false).order('created_at', { ascending: false }).limit(20)
  if (feed) {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id)
    if (ids.length === 0) return NextResponse.json({ posts: [] })
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
  const { caption, mediaUrls, isSpicy } = await req.json() as { caption: string; mediaUrls: string[]; isSpicy: boolean }
  const { data, error } = await supabase.from('posts').insert({ user_id: user.id, caption, media_urls: mediaUrls, is_spicy: isSpicy ?? false }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}

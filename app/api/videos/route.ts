import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Vertical video feed (TikTok/Reels-style). Returns non-spicy video posts.
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '0')
  const size = 8
  const { data, error } = await supabase
    .from('posts')
    .select('id, caption, media_urls, media_type, music_url, music_title, likes_count, created_at, users!user_id(id, username, display_name, avatar_url, is_verified)')
    .eq('is_spicy', false)
    .eq('media_type', 'video')
    .order('created_at', { ascending: false })
    .range(page * size, page * size + size - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ videos: data ?? [], hasMore: (data?.length ?? 0) === size })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: { username: string } }) {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, display_name, age, gender, location_city, bio, avatar_url, interests, looking_for, is_verified, created_at')
    .eq('username', params.username)
    .single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { count: likesCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('target_type', 'profile').eq('target_id', profile.id)
  const { data: posts } = await supabase.from('posts').select('id, media_urls, caption, likes_count, created_at').eq('user_id', profile.id).eq('is_spicy', false).order('created_at', { ascending: false }).limit(12)
  return NextResponse.json({ profile, likesCount: likesCount ?? 0, posts: posts ?? [] })
}

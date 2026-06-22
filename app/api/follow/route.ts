import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { followingId, action } = await req.json() as { followingId: string; action: 'follow' | 'unfollow' }
  if (followingId === user.id) return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 })
  if (action === 'follow') {
    await supabase.from('follows').upsert({ follower_id: user.id, following_id: followingId })
  } else {
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', followingId)
  }
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const list = req.nextUrl.searchParams.get('list') // 'followers' | 'following'
  const userId = req.nextUrl.searchParams.get('userId')

  // List mode: return follower/following user objects
  if (list && userId) {
    if (list === 'followers') {
      const { data } = await supabase
        .from('follows')
        .select('users!follower_id(id, username, display_name, avatar_url, is_verified)')
        .eq('following_id', userId)
      return NextResponse.json({ users: (data ?? []).map((r: any) => r.users).filter(Boolean) })
    } else {
      const { data } = await supabase
        .from('follows')
        .select('users!following_id(id, username, display_name, avatar_url, is_verified)')
        .eq('follower_id', userId)
      return NextResponse.json({ users: (data ?? []).map((r: any) => r.users).filter(Boolean) })
    }
  }

  // Default: is the current user following followingId?
  if (!user) return NextResponse.json({ isFollowing: false })
  const followingId = req.nextUrl.searchParams.get('followingId')
  if (!followingId) return NextResponse.json({ isFollowing: false })
  const { data } = await supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', followingId).single()
  return NextResponse.json({ isFollowing: !!data })
}

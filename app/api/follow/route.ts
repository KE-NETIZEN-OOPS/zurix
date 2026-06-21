import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { followingId, action } = await req.json() as { followingId: string; action: 'follow' | 'unfollow' }
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
  if (!user) return NextResponse.json({ isFollowing: false })
  const followingId = req.nextUrl.searchParams.get('followingId')
  if (!followingId) return NextResponse.json({ isFollowing: false })
  const { data } = await supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', followingId).single()
  return NextResponse.json({ isFollowing: !!data })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { targetType, targetId } = await req.json() as { targetType: string; targetId: string }
  await supabase.from('likes').upsert({ user_id: user.id, target_type: targetType, target_id: targetId })
  if (targetType === 'post') {
    await supabase.rpc('increment_likes', { post_id: targetId })
  }
  return NextResponse.json({ ok: true })
}

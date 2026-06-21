import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase.from('streams').select('id, title, hls_url, thumbnail_url, viewer_count, is_live, started_at, users!user_id(id, username, display_name, avatar_url)').eq('is_live', true).order('viewer_count', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ streams: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { title, action } = await req.json() as { title?: string; action?: string }
  if (action === 'end') {
    await supabase.from('streams').update({ is_live: false, ended_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_live', true)
    return NextResponse.json({ ok: true })
  }
  const streamKey = `${user.id}-${Date.now()}`
  const hlsUrl = `${process.env.RTMP_SERVER_URL}/hls/${streamKey}.m3u8`
  const { data, error } = await supabase.from('streams').upsert({ user_id: user.id, title: title ?? 'Live Stream', stream_key: streamKey, hls_url: hlsUrl, is_live: true, started_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stream: data, rtmpUrl: `${process.env.RTMP_INGEST_URL}/live`, streamKey })
}

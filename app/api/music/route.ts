import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// List the curated library plus the current user's own uploaded tracks
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase
    .from('music_tracks')
    .select('id, title, artist, url, duration_secs, is_library, uploaded_by')
    .or(`is_library.eq.true,uploaded_by.eq.${user.id}`)
    .order('is_library', { ascending: false })
    .order('created_at', { ascending: false })
  return NextResponse.json({ tracks: data ?? [] })
}

// Register an uploaded track (file already uploaded to storage client-side)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { title, artist, url, durationSecs } = await req.json() as { title: string; artist?: string; url: string; durationSecs?: number }
  if (!title || !url) return NextResponse.json({ error: 'title and url required' }, { status: 400 })
  const { data, error } = await supabase
    .from('music_tracks')
    .insert({ title, artist: artist || 'You', url, duration_secs: durationSecs ?? 0, is_library: false, uploaded_by: user.id })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ track: data })
}

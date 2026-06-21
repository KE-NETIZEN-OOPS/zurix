import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tier').eq('id', user.id).single()
  const tierRank: Record<string, number> = { free: 0, flame: 1, blaze: 2, inferno: 3 }
  if ((tierRank[profile?.tier ?? 'free'] ?? 0) < 3) return NextResponse.json({ error: 'Inferno tier required' }, { status: 403 })
  const affiliateId = process.env.CHATURBATE_AFFILIATE_ID
  if (affiliateId) {
    try {
      const res = await fetch(`https://chaturbate.com/affiliates/api/promotools/featured-rooms/?client_ip=request_ip&affiliate_id=${affiliateId}&limit=12`, { next: { revalidate: 300 } })
      const data = await res.json()
      return NextResponse.json({ rooms: data.results ?? [] })
    } catch { /* fall through to DB */ }
  }
  const { data } = await supabase.from('chaturbate_rooms').select('id, slug, display_name, preview_url, viewers').eq('is_active', true).order('viewers', { ascending: false }).limit(12)
  return NextResponse.json({ rooms: (data ?? []).map((r: any) => ({ ...r, embedUrl: `https://chaturbate.com/in/?tour=dT8X&campaign=Na4iE&track=embed&room=${r.slug}` })) })
}

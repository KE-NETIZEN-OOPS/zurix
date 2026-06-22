import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { haversineMiles } from '@/lib/geo'

interface Row {
  id: string; username: string; display_name: string; age: number
  gender: string; location_city: string; avatar_url: string; is_verified: boolean
  latitude: number | null; longitude: number | null; created_at: string
}

const PAGE_SIZE = 24

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const sp = req.nextUrl.searchParams
  const page = parseInt(sp.get('page') ?? '0')
  const lat = sp.get('lat') ? parseFloat(sp.get('lat')!) : null
  const lng = sp.get('lng') ? parseFloat(sp.get('lng')!) : null
  const q = (sp.get('q') ?? '').trim()
  const minAge = sp.get('minAge') ? parseInt(sp.get('minAge')!) : null
  const maxAge = sp.get('maxAge') ? parseInt(sp.get('maxAge')!) : null
  const gender = sp.get('gender')
  const shuffle = sp.get('shuffle') === '1'

  let query = supabase
    .from('users')
    .select('id, username, display_name, age, gender, location_city, avatar_url, is_verified, latitude, longitude, created_at')
    .eq('hide_data', false)
    .not('avatar_url', 'is', null)

  if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%,location_city.ilike.%${q}%`)
  if (minAge != null) query = query.gte('age', minAge)
  if (maxAge != null) query = query.lte('age', maxAge)
  if (gender && gender !== 'all') query = query.eq('gender', gender)

  // Fetch a pool we can rank in-memory (distance / shuffle).
  const { data, error } = await query.limit(600)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let rows = (data ?? []) as Row[]
  let ranked: any[] = rows

  if (lat != null && lng != null) {
    // Nearest-first; profiles without coords go last.
    const withDist = rows.map(r => ({
      r,
      d: r.latitude != null && r.longitude != null ? haversineMiles(lat, lng, r.latitude, r.longitude) : Number.POSITIVE_INFINITY,
    }))
    withDist.sort((a, b) => a.d - b.d)
    ranked = withDist.map(x => ({ ...x.r, distanceMiles: Number.isFinite(x.d) ? x.d : null }))
  } else if (shuffle) {
    for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]] }
    ranked = rows
  } else {
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    ranked = rows
  }

  const start = page * PAGE_SIZE
  const slice = ranked.slice(start, start + PAGE_SIZE)
  return NextResponse.json({ profiles: slice, page, hasMore: start + PAGE_SIZE < ranked.length })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '0')
  const pageSize = 20
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, age, location_city, avatar_url, is_verified, created_at')
    .eq('hide_data', false)
    .not('avatar_url', 'is', null)
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profiles: data, page, hasMore: (data?.length ?? 0) === pageSize })
}

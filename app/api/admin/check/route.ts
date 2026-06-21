import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ isAdmin: false })
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return NextResponse.json({ isAdmin: data?.is_admin ?? false })
}

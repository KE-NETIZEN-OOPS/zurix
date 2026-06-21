import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUploadUrl, mediaKey } from '@/lib/r2'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as { filename: string; contentType: string }
  if (!body.filename || !body.contentType) return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 })
  const key = mediaKey(user.id, body.filename)
  const uploadUrl = await getUploadUrl(key, body.contentType)
  return NextResponse.json({ uploadUrl, key, publicUrl: `${process.env.CF_R2_PUBLIC_URL}/${key}` })
}

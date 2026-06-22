'use client'
import { createClient } from '@/lib/supabase/client'

/**
 * Uploads a File to the self-hosted Supabase Storage `media` bucket and
 * returns its public URL. Replaces the old Cloudflare R2 presigned flow so
 * uploads work against the infrastructure that is actually running.
 */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const rand = Math.random().toString(36).slice(2, 10)
  const path = `${folder}/${user?.id ?? 'anon'}/${Date.now()}-${rand}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

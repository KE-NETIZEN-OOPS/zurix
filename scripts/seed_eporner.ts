import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Pull real, embeddable videos from eporner's public API v2 into adult_videos.
const QUERIES = ['popular', 'milf', 'amateur', 'ebony', 'latina', 'blonde']

interface EpVideo {
  id: string; title: string; keywords: string; length_sec: number
  embed: string; default_thumb?: { src: string }
}

async function fetchQuery(q: string): Promise<EpVideo[]> {
  const url = `https://www.eporner.com/api/v2/video/search/?query=${encodeURIComponent(q)}&per_page=15&thumbsize=big&order=top-weekly&format=json`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return json.videos ?? []
  } catch { return [] }
}

async function run() {
  const seen = new Set<string>()
  let inserted = 0
  for (const q of QUERIES) {
    const vids = await fetchQuery(q)
    for (const v of vids) {
      if (seen.has(v.embed)) continue
      seen.add(v.embed)
      const tags = (v.keywords ?? '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 6)
      const { error } = await supabase.from('adult_videos').insert({
        title: v.title,
        embed_url: v.embed,
        thumbnail_url: v.default_thumb?.src ?? null,
        duration_secs: v.length_sec ?? 0,
        tags,
        is_active: true,
      })
      if (!error) inserted++
    }
    console.log(`  ${q}: pool now ${inserted}`)
  }
  console.log(`Done. Inserted ${inserted} eporner videos.`)
}

run().catch(console.error)

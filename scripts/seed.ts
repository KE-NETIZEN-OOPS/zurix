import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

interface Profile {
  num: number
  display_name: string
  age: number
  gender: string
  location_city: string
  phone: string
  interests: string[]
  looking_for: string
  verified: boolean
  photos: string[]
  username: string
  email: string
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'
}

function parseProfiles(md: string): Profile[] {
  // The detailed section begins at "## Full Profile Data with Photo URLs"
  const startIdx = md.indexOf('## Full Profile Data with Photo URLs')
  const body = startIdx >= 0 ? md.slice(startIdx) : md

  const profiles: Profile[] = []
  // Split into "### N. Name (STATUS)" blocks
  const blocks = body.split(/^###\s+/m).slice(1)

  for (const block of blocks) {
    const lines = block.split('\n')
    const header = lines[0].trim() // e.g. "1. Joy (LIVE)"
    const headerMatch = header.match(/^(\d+)\.\s+(.+?)\s*\((\w+)\)\s*$/)
    if (!headerMatch) continue
    const num = parseInt(headerMatch[1])
    const display_name = headerMatch[2].trim()
    const status = headerMatch[3].toUpperCase()
    if (status !== 'LIVE') continue

    const text = block

    const ageMatch = text.match(/\*\*Age:\*\*\s*(\d+)/)
    const genderMatch = text.match(/\*\*Gender:\*\*\s*([^\|\n]+)/)
    const locMatch = text.match(/\*\*Location:\*\*\s*([^\|\n]+)/)
    const waMatch = text.match(/\*\*WhatsApp:\*\*\s*([^\n]+)/)
    const interestsMatch = text.match(/\*\*Interests:\*\*\s*([^\n]+)/)
    const lookingMatch = text.match(/\*\*Looking for:\*\*\s*([^\n]+)/)
    const verifiedMatch = text.match(/\*\*Verified:\*\*\s*(\w+)/)

    const age = ageMatch ? parseInt(ageMatch[1]) : 0
    if (age < 18) continue

    // Photo URLs from "- **Photo N:** URL" (skip the markdown image duplicate lines)
    const photos = [...text.matchAll(/\*\*Photo\s+\d+:\*\*\s*(https?:\/\/\S+)/g)].map(m => m[1])
    if (photos.length === 0) continue

    const interests = interestsMatch
      ? interestsMatch[1].split(/[,;]/).map(i => i.trim()).filter(Boolean)
      : []

    const username = `${slug(display_name)}${num}`

    profiles.push({
      num,
      display_name,
      age,
      gender: genderMatch ? genderMatch[1].trim() : 'other',
      location_city: locMatch ? locMatch[1].trim() : 'Nairobi',
      phone: waMatch ? waMatch[1].trim() : '',
      interests,
      looking_for: lookingMatch ? lookingMatch[1].trim() : 'friendship',
      verified: verifiedMatch ? /true/i.test(verifiedMatch[1]) : false,
      photos,
      username,
      email: `${username}@zurix.demo`,
    })
  }
  return profiles
}

async function seed() {
  const mdPath = process.env.SEED_FILE ?? '/opt/zurix/oblee.md'
  let md: string
  try {
    md = readFileSync(mdPath, 'utf-8')
  } catch {
    console.error('Could not read profiles file at', mdPath)
    process.exit(1)
  }

  const profiles = parseProfiles(md)
  console.log(`Parsed ${profiles.length} LIVE profiles with photos`)

  let inserted = 0
  let skipped = 0
  let posts = 0

  for (const p of profiles) {
    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: p.email,
      password: `Zurix!${p.username}2024`,
      email_confirm: true,
    })
    if (authErr || !authData?.user) {
      // Likely already exists — try to look it up and continue
      skipped++
      if (skipped <= 5) console.warn(`Skip ${p.display_name} (#${p.num}): ${authErr?.message}`)
      continue
    }

    const userId = authData.user.id

    const { error: dbErr } = await supabase.from('users').upsert({
      id: userId,
      username: p.username,
      display_name: p.display_name,
      email: p.email,
      phone: p.phone,
      age: p.age,
      gender: p.gender,
      location_city: p.location_city,
      interests: p.interests,
      looking_for: p.looking_for,
      avatar_url: p.photos[0],
      is_verified: p.verified,
      tier: 'free',
    })
    if (dbErr) {
      skipped++
      if (skipped <= 5) console.warn(`DB error ${p.display_name}: ${dbErr.message}`)
      continue
    }

    // One post per photo so profile grids + explore have content
    const postRows = p.photos.map((url, i) => ({
      user_id: userId,
      caption: i === 0 ? `Hi, I'm ${p.display_name} 💕` : '',
      media_urls: [url],
      is_spicy: false,
      likes_count: Math.floor(Math.random() * 800),
    }))
    const { error: postErr } = await supabase.from('posts').insert(postRows)
    if (!postErr) posts += postRows.length

    inserted++
    if (inserted % 50 === 0) console.log(`Inserted ${inserted}/${profiles.length} users, ${posts} posts...`)
  }

  console.log(`Done. Users: ${inserted}, Posts: ${posts}, Skipped: ${skipped}`)
}

seed().catch(console.error)

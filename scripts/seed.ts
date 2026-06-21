import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!
)

interface Profile {
  display_name: string; age: number; gender: string; location_city: string
  phone: string; interests: string[]; looking_for: string; avatar_url: string
  email: string; username: string
}

function parseProfiles(md: string): Profile[] {
  const profiles: Profile[] = []
  const sections = md.split(/^##\s+/m).filter(Boolean)

  for (const section of sections) {
    const lines = section.trim().split('\n')
    const display_name = lines[0].trim()
    if (!display_name || display_name.length < 2) continue

    const get = (key: string): string => {
      const line = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase() + ':'))
      return line ? line.split(':').slice(1).join(':').trim() : ''
    }

    const photoLine = lines.find(l => l.includes('zqalbxcyacmeeevarxwy.supabase.co') || l.includes('http'))
    const photoMatch = photoLine?.match(/https?:\/\/[^\s)]+/)
    const avatar_url = photoMatch?.[0] ?? ''

    const ageRaw = parseInt(get('age'))
    if (isNaN(ageRaw) || ageRaw < 18) continue

    const interestsRaw = get('interests')
    const interests = interestsRaw ? interestsRaw.split(/[,;]/).map(i => i.trim()).filter(Boolean) : []

    const username = display_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) + Math.floor(Math.random() * 9999)
    const email = `${username}@zurix.demo`

    profiles.push({
      display_name,
      age: ageRaw,
      gender: get('gender') || 'other',
      location_city: get('location') || get('city') || 'Nairobi',
      phone: get('phone') || get('whatsapp') || '',
      interests,
      looking_for: get('looking_for') || get('looking for') || 'friendship',
      avatar_url,
      email,
      username,
    })
  }
  return profiles
}

async function seed() {
  const mdPath = join(process.cwd(), '../Desktop/hennesy/oblee.md')
  let md: string
  try { md = readFileSync(mdPath, 'utf-8') }
  catch { console.error('Could not read oblee.md at', mdPath); process.exit(1) }

  const profiles = parseProfiles(md)
  console.log(`Parsed ${profiles.length} profiles from oblee.md`)

  let inserted = 0; let skipped = 0

  for (const p of profiles) {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: p.email, password: `zurix-${p.username}-2024`, email_confirm: true
    })
    if (authErr) { console.warn(`Skip ${p.display_name}: ${authErr.message}`); skipped++; continue }

    const userId = authData.user.id
    const { error: dbErr } = await supabase.from('users').upsert({
      id: userId, username: p.username, display_name: p.display_name, email: p.email,
      phone: p.phone, age: p.age, gender: p.gender, location_city: p.location_city,
      interests: p.interests, looking_for: p.looking_for, avatar_url: p.avatar_url,
      tier: 'free',
    })
    if (dbErr) { console.warn(`DB error ${p.display_name}: ${dbErr.message}`); skipped++; continue }
    inserted++
    if (inserted % 50 === 0) console.log(`Inserted ${inserted}/${profiles.length}...`)
  }

  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}`)
}

seed().catch(console.error)

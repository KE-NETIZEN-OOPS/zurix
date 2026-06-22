import { createClient } from '@supabase/supabase-js'
import { geocodeCity } from '../lib/geo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function jitter() { return (Math.random() - 0.5) * 0.08 } // ~±2.5 miles

async function run() {
  const { data: users } = await supabase
    .from('users')
    .select('id, location_city')
    .is('latitude', null)
    .limit(2000)

  console.log(`Backfilling ${users?.length ?? 0} users without coordinates`)
  let updated = 0, missed = 0

  for (const u of users ?? []) {
    const coords = geocodeCity(u.location_city)
    if (!coords) { missed++; continue }
    const [lat, lng] = coords
    const { error } = await supabase.from('users').update({
      latitude: lat + jitter(),
      longitude: lng + jitter(),
    }).eq('id', u.id)
    if (!error) updated++
    if (updated % 100 === 0 && updated) console.log(`  ${updated} updated…`)
  }
  console.log(`Done. Updated: ${updated}, no-match city: ${missed}`)
}

run().catch(console.error)

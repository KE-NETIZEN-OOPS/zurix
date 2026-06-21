# ZuriX Phase 7: Settings, Admin Panel + Deployment

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Privacy settings with hide-my-data toggle, admin panel for content curation and user management, then push to GitHub and deploy to boss-server.

**Architecture:** Admin panel is a protected server page (checks user role). Settings page updates user row. Deployment uses PM2 on boss-server with nginx reverse proxy.

**Tech Stack:** PM2, nginx, GitHub CLI

## Global Constraints
- Admin access: add `is_admin bool default false` column to users
- hide-my-data: Inferno only
- GitHub repo: KE-NETIZEN-OOPS/zurix (public)
- Never commit .env.local

---

### Task 25: Privacy settings page

**Files:**
- Create: `app/(app)/settings/page.tsx`
- Create: `app/api/settings/route.ts`

- [ ] **Step 1: Create app/api/settings/route.ts**
```ts
// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/tiers'

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('tier').eq('id', user.id).single()

  const body = await req.json() as {
    bio?: string
    hide_data?: boolean
    location_city?: string
  }

  // hide_data requires Inferno tier
  if (body.hide_data !== undefined) {
    if (!hasAccess((profile?.tier ?? 'free') as any, 'inferno')) {
      return NextResponse.json({ error: 'Inferno tier required for hide-my-data' }, { status: 403 })
    }
  }

  const { error } = await supabase.from('users').update(body).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('users')
    .select('display_name, bio, location_city, hide_data, tier, phone, avatar_url, interests')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ profile: data })
}
```

- [ ] **Step 2: Create app/(app)/settings/page.tsx**
```tsx
// app/(app)/settings/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hasAccess, type Tier } from '@/lib/tiers'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<{
    display_name: string; bio: string; location_city: string;
    hide_data: boolean; tier: Tier; phone: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setProfile(d.profile))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bio: profile.bio,
        location_city: profile.location_city,
        hide_data: profile.hide_data,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!profile) return <div className="text-zinc-500">Loading...</div>

  const canHide = hasAccess(profile.tier, 'inferno')

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col gap-4">
          <h2 className="font-bold text-sm text-zinc-300">Profile</h2>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Bio</label>
            <textarea
              value={profile.bio ?? ''}
              onChange={e => setProfile(p => p ? { ...p, bio: e.target.value } : p)}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-amber-500"
              placeholder="Tell people about yourself..."
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">City</label>
            <input
              value={profile.location_city ?? ''}
              onChange={e => setProfile(p => p ? { ...p, location_city: e.target.value } : p)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Your city"
            />
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h2 className="font-bold text-sm text-zinc-300 mb-3">Privacy</h2>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Hide my data</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Removes you from explore, hides phone and exact location. Only followers can message you.
                {!canHide && (
                  <span className="text-amber-500 ml-1">Inferno tier required.</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => canHide && setProfile(p => p ? { ...p, hide_data: !p.hide_data } : p)}
              className={`relative w-12 h-6 rounded-full transition flex-shrink-0 ${
                profile.hide_data && canHide ? 'bg-amber-500' : 'bg-zinc-700'
              } ${!canHide ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                profile.hide_data && canHide ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-amber-500 text-black font-bold py-3 rounded-full hover:bg-amber-400 disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>

      <div className="mt-6 border-t border-zinc-800 pt-6">
        <button
          onClick={signOut}
          className="text-red-500 hover:text-red-400 text-sm font-medium transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: add settings page with bio, location, and hide-my-data toggle"
```

---

### Task 26: Admin panel

**Files:**
- Create: `supabase/migrations/002_admin.sql`
- Create: `app/admin/page.tsx`
- Create: `app/api/admin/videos/route.ts`
- Create: `app/api/admin/rooms/route.ts`
- Create: `middleware.ts` (modify to protect /admin)

- [ ] **Step 1: Run admin migration in Supabase SQL Editor**
```sql
-- supabase/migrations/002_admin.sql
alter table users add column if not exists is_admin bool default false;

-- Policy: only admins can insert/delete adult_videos
create policy "admin_manage_videos" on adult_videos for all
  using (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

create policy "admin_manage_chaturbate" on chaturbate_rooms for all
  using (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

-- Make yourself admin (replace with your actual user id)
-- update users set is_admin = true where email = 'your@email.com';
```

- [ ] **Step 2: Set yourself as admin in Supabase**

In Supabase Dashboard → SQL Editor:
```sql
update users set is_admin = true where email = 'your-admin@email.com';
```

- [ ] **Step 3: Add admin protection to middleware.ts**

In `middleware.ts`, add this check after the existing user check:
```ts
// Protect /admin route
if (pathname.startsWith('/admin')) {
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  // Admin check happens at page level (can't query DB in edge middleware)
}
```

- [ ] **Step 4: Create app/api/admin/videos/route.ts**
```ts
// app/api/admin/videos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!data?.is_admin) return null
  return { supabase, user }
}

export async function GET() {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await auth.supabase.from('adult_videos').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ videos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json() as { eporner_id: string; title: string; thumbnail_url?: string; category?: string }
  const { data, error } = await auth.supabase.from('adult_videos').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ video: data })
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json() as { id: string }
  await auth.supabase.from('adult_videos').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create app/api/admin/rooms/route.ts**
```ts
// app/api/admin/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!data?.is_admin) return null
  return { supabase, user }
}

export async function GET() {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await auth.supabase.from('chaturbate_rooms').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ rooms: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json() as { room_slug: string; display_name?: string }
  const { data, error } = await auth.supabase.from('chaturbate_rooms').insert({
    ...body,
    added_by: auth.user.id,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ room: data })
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json() as { id: string }
  await auth.supabase.from('chaturbate_rooms').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Create app/admin/page.tsx**
```tsx
// app/admin/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'videos' | 'rooms' | 'users'>('videos')
  const [videos, setVideos] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [newVideo, setNewVideo] = useState({ eporner_id: '', title: '', thumbnail_url: '', category: 'General' })
  const [newRoom, setNewRoom] = useState({ room_slug: '', display_name: '' })

  useEffect(() => {
    fetch('/api/admin/videos').then(r => r.json()).then(d => {
      if (d.error === 'Forbidden') router.push('/explore')
      else setVideos(d.videos ?? [])
    })
    fetch('/api/admin/rooms').then(r => r.json()).then(d => setRooms(d.rooms ?? []))
  }, [])

  async function addVideo(e: React.FormEvent) {
    e.preventDefault()
    const { video } = await fetch('/api/admin/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVideo),
    }).then(r => r.json())
    setVideos(prev => [video, ...prev])
    setNewVideo({ eporner_id: '', title: '', thumbnail_url: '', category: 'General' })
  }

  async function deleteVideo(id: string) {
    await fetch('/api/admin/videos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setVideos(prev => prev.filter(v => v.id !== id))
  }

  async function addRoom(e: React.FormEvent) {
    e.preventDefault()
    const { room } = await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRoom),
    }).then(r => r.json())
    setRooms(prev => [room, ...prev])
    setNewRoom({ room_slug: '', display_name: '' })
  }

  async function deleteRoom(id: string) {
    await fetch('/api/admin/rooms', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setRooms(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['videos', 'rooms', 'users'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === t ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'videos' && (
        <div>
          <h2 className="font-bold mb-3">Adult Videos (eporner.com)</h2>
          <form onSubmit={addVideo} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-4 flex flex-col gap-3">
            <p className="text-xs text-zinc-500">Find eporner_id from URL: eporner.com/video/<strong>aBcDeFg</strong>/</p>
            {[
              { key: 'eporner_id', placeholder: 'eporner_id (from URL)', required: true },
              { key: 'title', placeholder: 'Video title', required: true },
              { key: 'thumbnail_url', placeholder: 'Thumbnail URL (optional)', required: false },
              { key: 'category', placeholder: 'Category (General, Kenyan, Ebony, Amateur)', required: false },
            ].map(f => (
              <input key={f.key} value={newVideo[f.key as keyof typeof newVideo]}
                onChange={e => setNewVideo(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder} required={f.required}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            ))}
            <button type="submit" className="bg-amber-500 text-black font-bold py-2 rounded-full text-sm">Add Video</button>
          </form>

          <div className="flex flex-col gap-2">
            {videos.map(v => (
              <div key={v.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{v.title}</p>
                  <p className="text-xs text-zinc-500">{v.eporner_id} · {v.category}</p>
                </div>
                <button onClick={() => deleteVideo(v.id)} className="text-red-500 hover:text-red-400 text-sm">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'rooms' && (
        <div>
          <h2 className="font-bold mb-3">Chaturbate Rooms</h2>
          <form onSubmit={addRoom} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-4 flex flex-col gap-3">
            <p className="text-xs text-zinc-500">room_slug is the username from chaturbate.com/username/</p>
            <input value={newRoom.room_slug} onChange={e => setNewRoom(p => ({ ...p, room_slug: e.target.value }))}
              placeholder="room_slug (Chaturbate username)" required
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <input value={newRoom.display_name} onChange={e => setNewRoom(p => ({ ...p, display_name: e.target.value }))}
              placeholder="Display name (optional)"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <button type="submit" className="bg-amber-500 text-black font-bold py-2 rounded-full text-sm">Add Room</button>
          </form>

          <div className="flex flex-col gap-2">
            {rooms.map(r => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{r.display_name || r.room_slug}</p>
                  <p className="text-xs text-zinc-500">chaturbate.com/{r.room_slug}/</p>
                </div>
                <button onClick={() => deleteRoom(r.id)} className="text-red-500 hover:text-red-400 text-sm">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="text-zinc-400 text-sm">
          Manage users directly in <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/project/default/editor`} className="text-amber-500 underline">Supabase Table Editor</a>.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: add admin panel for video and Chaturbate room curation"
```

---

### Task 27: Push to GitHub

**Files:**
- Modify: `README.md` (create minimal one)

- [ ] **Step 1: Verify .gitignore has all secrets excluded**

Confirm `C:\Users\Administrator\zurix\.gitignore` includes:
```
.env.local
.env*.local
node_modules
.next
/tmp
```

- [ ] **Step 2: Create GitHub repo**
```bash
gh auth login
gh repo create KE-NETIZEN-OOPS/zurix --public --source=. --remote=origin --push
```
Expected: Repo created and code pushed to github.com/KE-NETIZEN-OOPS/zurix

- [ ] **Step 3: Verify no secrets in the pushed code**
```bash
gh browse
```
Check that .env.local is absent and no credentials appear in any committed file.

- [ ] **Step 4: Tag v0.1.0**
```bash
git tag v0.1.0
git push origin v0.1.0
```

---

### Task 28: Deploy to boss-server

- [ ] **Step 1: SSH into boss-server**
```bash
ssh boss-server
```

- [ ] **Step 2: Install Node.js 20 and pnpm on boss-server (if not present)**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pnpm pm2
```

- [ ] **Step 3: Clone repo and install dependencies**
```bash
cd /var/www
git clone https://github.com/KE-NETIZEN-OOPS/zurix.git
cd zurix
pnpm install
```

- [ ] **Step 4: Create .env.local on boss-server (fill in real production values)**
```bash
nano /var/www/zurix/.env.local
```
Paste all production environment variables from your local .env.local with real keys.

- [ ] **Step 5: Build Next.js app**
```bash
cd /var/www/zurix && pnpm build
```
Expected: Build completes with no errors

- [ ] **Step 6: Start with PM2**
```bash
pm2 start pnpm --name zurix -- start -- --port 3000
pm2 save
pm2 startup
```
Expected: `pm2 list` shows zurix as "online"

- [ ] **Step 7: Deploy nginx config**
```bash
cp /var/www/zurix/server/nginx-rtmp.conf /etc/nginx/nginx.conf
# Edit server_name to your actual domain
nano /etc/nginx/nginx.conf
nginx -t && systemctl reload nginx
```

- [ ] **Step 8: Run database migration on production Supabase**
Log into Supabase Dashboard → SQL Editor → paste and run `supabase/migrations/001_initial.sql` then `002_admin.sql`

- [ ] **Step 9: Run seed script on boss-server**
```bash
cd /var/www/zurix
# Copy oblee.md to boss-server first:
# (from local machine) scp C:\Users\Administrator\Desktop\hennesy\oblee.md boss-server:/tmp/oblee.md
# Then update the path in scripts/seed.ts to /tmp/oblee.md
npx tsx scripts/seed.ts
```

- [ ] **Step 10: Verify deployment**
Open https://zurix.co.ke (or your domain) in browser.
Expected:
- Landing page loads
- /register creates account
- /explore shows seeded profiles
- /payments shows tier cards

- [ ] **Step 11: Final commit and push**
```bash
git add -A && git commit -m "feat: complete ZuriX platform — all phases implemented"
git push origin main
```

Done. ZuriX is live.

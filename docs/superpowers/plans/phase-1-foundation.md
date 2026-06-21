# ZuriX Phase 1: Foundation

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Scaffold the Next.js project, wire Supabase + R2, run migrations, and seed 508 dummy profiles.

**Architecture:** Next.js 14 App Router (TypeScript) → Supabase (auth + PostgreSQL) → Cloudflare R2 (media). All infra wired before any UI is built.

**Tech Stack:** Next.js 14, pnpm, Supabase SSR, @aws-sdk/client-s3, Vitest, Tailwind CSS

## Global Constraints
- Package manager: pnpm only
- Node: 18+
- TypeScript strict mode
- Tailwind for all styling
- Vitest for all tests
- Env var for Supabase admin access: `SUPABASE_ADMIN_KEY` (set to your project service role key)

---

### Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `.env.local`, `.gitignore`

- [ ] **Step 1: Create project**
```bash
cd C:\Users\Administrator\zurix
pnpm create next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-git
```
Expected: Next.js 14 project created in current directory

- [ ] **Step 2: Install runtime dependencies**
```bash
pnpm add @supabase/supabase-js @supabase/ssr @aws-sdk/client-s3 @aws-sdk/s3-request-presigner hls.js swr clsx
```

- [ ] **Step 3: Install dev dependencies**
```bash
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom tsx
```

- [ ] **Step 4: Create vitest.config.ts**
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 5: Create tests/setup.ts**
```ts
// tests/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Create .env.local (fill in real values — never commit this file)**
```
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_ADMIN_KEY=<service-role-key>

CF_ACCOUNT_ID=<cloudflare-account-id>
CF_R2_ACCESS_KEY=<r2-access-key>
CF_R2_SECRET_KEY=<r2-secret-key>
CF_R2_BUCKET=zurix-media
CF_R2_PUBLIC_URL=https://pub-XXXX.r2.dev

MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=https://zurix.co.ke/api/payments/mpesa/callback

PESAPAL_CONSUMER_KEY=
PESAPAL_CONSUMER_SECRET=

NOWPAYMENTS_API_KEY=
NOWPAYMENTS_IPN_SECRET=

CHATURBATE_AFFILIATE_ID=
STREAM_AUTH_SECRET=<random-32-char-string>
```

- [ ] **Step 7: Verify .gitignore includes .env.local**
Confirm `.gitignore` has:
```
.env.local
.env*.local
/tmp/hls
```

- [ ] **Step 8: Add test script to package.json**
In `package.json` scripts add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 9: Verify dev server starts**
```bash
pnpm dev
```
Expected: Next.js dev server on http://localhost:3000 with no errors

- [ ] **Step 10: Commit**
```bash
git add -A && git commit -m "feat: scaffold Next.js 14 project with dependencies"
```

---

### Task 2: Supabase clients + middleware + tier helper

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/tiers.ts`
- Create: `middleware.ts`
- Test: `tests/lib/tiers.test.ts`

- [ ] **Step 1: Create lib/supabase/server.ts**
```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export function createAdminClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ADMIN_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 2: Create lib/supabase/client.ts**
```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create lib/tiers.ts**
```ts
// lib/tiers.ts
export type Tier = 'free' | 'flame' | 'blaze' | 'inferno'

const TIER_RANK: Record<Tier, number> = {
  free: 0, flame: 1, blaze: 2, inferno: 3,
}

export const TIER_PRICES: Record<Exclude<Tier, 'free'>, { monthly: number; annual: number }> = {
  flame:   { monthly: 299,  annual: 2990 },
  blaze:   { monthly: 499,  annual: 4990 },
  inferno: { monthly: 999,  annual: 9990 },
}

export function hasAccess(userTier: Tier, required: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[required]
}

export function tierLabel(tier: Tier): string {
  const labels: Record<Tier, string> = {
    free: 'Free', flame: 'Flame', blaze: 'Blaze', inferno: 'Inferno',
  }
  return labels[tier]
}
```

- [ ] **Step 4: Write tier tests**
```ts
// tests/lib/tiers.test.ts
import { describe, it, expect } from 'vitest'
import { hasAccess } from '@/lib/tiers'

describe('hasAccess', () => {
  it('free cannot access flame', () => expect(hasAccess('free', 'flame')).toBe(false))
  it('flame can access flame', () => expect(hasAccess('flame', 'flame')).toBe(true))
  it('blaze can access flame', () => expect(hasAccess('blaze', 'flame')).toBe(true))
  it('inferno can access blaze', () => expect(hasAccess('inferno', 'blaze')).toBe(true))
  it('blaze cannot access inferno', () => expect(hasAccess('blaze', 'inferno')).toBe(false))
})
```

- [ ] **Step 5: Run tests**
```bash
pnpm test
```
Expected: 5 tests pass

- [ ] **Step 6: Create middleware.ts**
```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isApiRoute = pathname.startsWith('/api')
  const isPublicPage = pathname === '/'

  if (!user && !isAuthRoute && !isApiRoute && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/explore', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: add Supabase clients, middleware, and tiers helper"
```

---

### Task 3: Database migration

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create migration file**
```sql
-- supabase/migrations/001_initial.sql

create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  display_name text not null,
  email text unique,
  phone text,
  gender text,
  age int,
  location_city text,
  location_country text default 'Kenya',
  bio text,
  avatar_url text,
  interests text[],
  looking_for text,
  is_verified bool default false,
  hide_data bool default false,
  tier text default 'free',
  tier_expires_at timestamptz,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create table follows (
  follower_id uuid references users(id) on delete cascade,
  following_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  caption text,
  media_urls text[],
  is_spicy bool default false,
  likes_count int default 0,
  created_at timestamptz default now()
);

create table likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz default now(),
  unique(user_id, target_type, target_id)
);

create table stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  media_url text not null,
  expires_at timestamptz not null,
  views_count int default 0,
  created_at timestamptz default now()
);

create table streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text,
  stream_key text unique not null,
  hls_url text,
  is_live bool default false,
  viewer_count int default 0,
  started_at timestamptz
);

create table chaturbate_rooms (
  id uuid primary key default gen_random_uuid(),
  added_by uuid references users(id),
  room_slug text not null,
  display_name text,
  thumbnail_url text,
  is_featured bool default true,
  created_at timestamptz default now()
);

create table adult_videos (
  id uuid primary key default gen_random_uuid(),
  eporner_id text not null,
  title text not null,
  thumbnail_url text,
  category text default 'General',
  is_featured bool default false,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references users(id) on delete cascade,
  recipient_id uuid references users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  tier text not null,
  billing_cycle text not null,
  amount_kes int not null,
  payment_method text not null,
  provider_ref text,
  status text default 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table users enable row level security;
alter table follows enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table stories enable row level security;
alter table streams enable row level security;
alter table messages enable row level security;
alter table subscriptions enable row level security;
alter table chaturbate_rooms enable row level security;
alter table adult_videos enable row level security;

-- Users policies
create policy "read_visible_users" on users for select
  using (hide_data = false or auth.uid() = id);
create policy "update_own_user" on users for update
  using (auth.uid() = id);
create policy "insert_user" on users for insert
  with check (auth.uid() = id);

-- Messages policies
create policy "read_own_messages" on messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "send_messages" on messages for insert
  with check (auth.uid() = sender_id);

-- Posts policies
create policy "read_posts" on posts for select
  using (
    is_spicy = false
    or exists (
      select 1 from users where id = auth.uid()
      and tier in ('blaze', 'inferno')
    )
  );
create policy "insert_own_posts" on posts for insert
  with check (auth.uid() = user_id);
create policy "delete_own_posts" on posts for delete
  using (auth.uid() = user_id);

-- Social policies
create policy "read_follows" on follows for select using (true);
create policy "manage_own_follows" on follows for all using (auth.uid() = follower_id);
create policy "read_likes" on likes for select using (true);
create policy "manage_own_likes" on likes for all using (auth.uid() = user_id);
create policy "read_active_stories" on stories for select using (expires_at > now());
create policy "manage_own_stories" on stories for all using (auth.uid() = user_id);

-- Streams
create policy "read_streams" on streams for select using (true);
create policy "manage_own_stream" on streams for all using (auth.uid() = user_id);

-- Admin-curated content (public read)
create policy "read_chaturbate" on chaturbate_rooms for select using (is_featured = true);
create policy "read_adult_videos" on adult_videos for select using (true);

-- Subscriptions
create policy "read_own_subscriptions" on subscriptions for select
  using (auth.uid() = user_id);
create policy "insert_subscription" on subscriptions for insert
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Run migration**

Option A — via Supabase CLI:
```bash
npx supabase db push
```
Option B — paste into Supabase Dashboard → SQL Editor → Run

Expected: All 10 tables created, RLS enabled, policies applied

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: add full database schema with RLS policies"
```

---

### Task 4: Cloudflare R2 client + upload API

**Files:**
- Create: `lib/r2.ts`
- Create: `app/api/upload/route.ts`
- Test: `tests/lib/r2.test.ts`

- [ ] **Step 1: Create lib/r2.ts**
```ts
// lib/r2.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CF_R2_SECRET_KEY!,
  },
})

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: process.env.CF_R2_BUCKET!,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, cmd, { expiresIn: 300 })
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({
    Bucket: process.env.CF_R2_BUCKET!,
    Key: key,
  }))
}

export function getPublicUrl(key: string): string {
  return `${process.env.CF_R2_PUBLIC_URL}/${key}`
}

export function mediaKey(userId: string, filename: string): string {
  return `users/${userId}/${Date.now()}-${filename}`
}
```

- [ ] **Step 2: Write R2 tests**
```ts
// tests/lib/r2.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getPublicUrl, mediaKey } from '@/lib/r2'

describe('r2 helpers', () => {
  beforeEach(() => {
    process.env.CF_R2_PUBLIC_URL = 'https://pub-test.r2.dev'
  })

  it('getPublicUrl builds correct URL', () => {
    expect(getPublicUrl('users/123/photo.jpg'))
      .toBe('https://pub-test.r2.dev/users/123/photo.jpg')
  })

  it('mediaKey includes userId and filename', () => {
    const key = mediaKey('user-abc', 'photo.jpg')
    expect(key).toContain('users/user-abc/')
    expect(key).toContain('photo.jpg')
  })
})
```

- [ ] **Step 3: Run tests**
```bash
pnpm test
```
Expected: 7 tests pass (5 tier + 2 r2)

- [ ] **Step 4: Create upload API route**
```ts
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUploadUrl, mediaKey } from '@/lib/r2'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { filename: string; contentType: string }
  if (!body.filename || !body.contentType) {
    return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 })
  }

  const key = mediaKey(user.id, body.filename)
  const uploadUrl = await getUploadUrl(key, body.contentType)
  return NextResponse.json({ uploadUrl, key, publicUrl: `${process.env.CF_R2_PUBLIC_URL}/${key}` })
}
```

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add R2 client and presigned upload API"
```

---

### Task 5: Seed 508 profiles

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Create scripts/seed.ts**
```ts
// scripts/seed.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ADMIN_KEY!
)

interface Profile {
  display_name: string
  age: number
  gender: string
  location_city: string
  phone: string
  interests: string[]
  looking_for: string
  avatar_url: string
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 9999)
}

function parseProfiles(md: string): Profile[] {
  const profiles: Profile[] = []
  const sections = md.split(/\n### \d+\./).slice(1)

  for (const section of sections) {
    const nameMatch = section.match(/^(.+?) \(/)
    const ageMatch = section.match(/\*\*Age:\*\* (\d+)/)
    const genderMatch = section.match(/\*\*Gender:\*\* (\w+)/)
    const locationMatch = section.match(/\*\*Location:\*\* (.+)/)
    const phoneMatch = section.match(/\*\*WhatsApp:\*\* (\d+)/)
    const interestsMatch = section.match(/\*\*Interests:\*\* (.+)/)
    const lookingMatch = section.match(/\*\*Looking for:\*\* (.+)/)
    const photoUrls = [...section.matchAll(/\*\*Photo \d+:\*\* (https:\/\/\S+)/g)].map(m => m[1])

    if (!nameMatch || !ageMatch || photoUrls.length === 0) continue

    profiles.push({
      display_name: nameMatch[1].trim(),
      age: parseInt(ageMatch[1]),
      gender: genderMatch?.[1] ?? 'female',
      location_city: locationMatch?.[1]?.trim() ?? 'Nairobi',
      phone: phoneMatch?.[1] ?? '',
      interests: interestsMatch ? interestsMatch[1].split(',').map(s => s.trim()) : [],
      looking_for: lookingMatch?.[1]?.trim() ?? '',
      avatar_url: photoUrls[0],
    })
  }
  return profiles
}

async function seed() {
  const md = readFileSync('C:/Users/Administrator/Desktop/hennesy/oblee.md', 'utf-8')
  const profiles = parseProfiles(md)
  console.log(`Parsed ${profiles.length} profiles`)

  let inserted = 0
  for (const p of profiles) {
    const { error } = await supabase.from('users').insert({
      username: slugify(p.display_name),
      display_name: p.display_name,
      phone: p.phone,
      gender: p.gender,
      age: p.age,
      location_city: p.location_city,
      avatar_url: p.avatar_url,
      interests: p.interests,
      looking_for: p.looking_for,
      is_verified: true,
      tier: 'free',
    })
    if (error) console.error(`Skip ${p.display_name}: ${error.message}`)
    else inserted++
  }
  console.log(`Done: ${inserted} profiles seeded`)
}

seed().catch(console.error)
```

- [ ] **Step 2: Run seed**
```bash
npx tsx scripts/seed.ts
```
Expected output: `Done: ~508 profiles seeded`

- [ ] **Step 3: Verify rows in Supabase**
Open Supabase → Table Editor → users. Expect ~508 rows with avatar_url populated.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: add seed script for 508 dummy profiles from patachat export"
```

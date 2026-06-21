# ZuriX — Design Spec
**Date:** 2026-06-21
**Status:** Approved

---

## Overview

ZuriX is a Kenya-first adult dating and social platform. Users explore profiles Instagram-style, follow, like, post photos and stories, chat with locals and foreigners, watch live streams, and access adult content. Three paid tiers (Flame/Blaze/Inferno) gate features progressively. Payments via M-Pesa, bank, and crypto.

**Tagline:** *Beautiful connections. No limits.*

---

## 1. Infrastructure

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router (TypeScript) |
| Database + Auth | Supabase (PostgreSQL + Row Level Security) |
| Media storage | Cloudflare R2 (photos, posts, stories, user content) |
| App server | boss-server — nginx + PM2 → Next.js on port 3000 |
| Live streaming | nginx-rtmp on boss-server (port 1935 RTMP → HLS) |
| Payments | Daraja API (M-Pesa) + Pesapal (bank/card) + NOWPayments (crypto) |
| Repo | `KE-NETIZEN-OOPS/zurix` (public GitHub) |

---

## 2. Subscription Tiers

| Tier | Monthly | Annual | Access |
|------|---------|--------|--------|
| Free | — | — | Browse explore (spicy blurred), view public profiles |
| Flame | KES 299 | KES 2,990 | Unlimited likes, follow, DMs, post photos |
| Blaze | KES 499 | KES 4,990 | + Stories, spicy content feed, adult video section |
| Inferno | KES 999 | KES 9,990 | + Live streaming (watch + go live), Chaturbate featured rooms, hide-my-data toggle, verified badge |

Annual = 10 months price (2 months free).

---

## 3. Pages & Routes

| Route | Description | Gate |
|-------|-------------|------|
| `/` | Landing — hero, pricing, sign up CTA | Public |
| `/explore` | Infinite scroll profile grid, swipe-up interest | Public (limited) |
| `/profile/[username]` | Avatar, bio, location, account age, likes count, photo grid, stories | Public |
| `/posts` | Feed of people you follow | Flame+ |
| `/stories` | Full-screen story viewer, 24hr expiry | Flame+ |
| `/spicy` | Locked user-posted spicy content feed | Blaze+ |
| `/adult` | eporner.com iframe embed video section, category filter | Blaze+ + age gate |
| `/live` | ZuriX live streams (HLS player) + Chaturbate featured rooms | Inferno |
| `/go-live` | RTMP credentials, stream title, live dashboard | Inferno |
| `/chat` | DM inbox and message threads | Flame+ |
| `/payments` | Tier selection, billing cycle, payment method, history | Auth |
| `/settings` | Privacy controls, hide-my-data, notifications | Auth |
| `/admin` | Seed profiles, user management, content moderation, revenue | Admin role |

---

## 4. UI/UX

**Visual direction:** Dark mode-first. Deep black background (#0a0a0a), gold/amber accent (#f59e0b), white text. Rounded cards, smooth transitions. Mobile-first responsive.

**Explore grid:**
- Infinite scroll, 2-col mobile / 3-col tablet / 4-col desktop
- Profile photo fills card, name + age + city overlay at bottom
- Mobile: swipe up = Interested (like + follow request)
- Desktop: hover reveals Like, Follow, Message buttons

**Profile page:**
- Avatar (large), display name, username, age, city, account age badge ("Member 3 months")
- `❤ 1,204 likes` counter — visible to all
- Follow / Message / Interested action buttons
- Photo grid (posts)
- Stories row (circular avatars at top)
- Bio + interests chips

**Stories:**
- Circular avatar row at top of explore and posts feed
- Full-screen viewer on tap, progress bar, tap right/left to navigate
- 24-hour auto-expire

**Age gate:**
- Hard 18+ confirmation wall on `/adult`, `/spicy`, `/live`
- Cookie-persisted per browser session
- Cannot be bypassed by URL — server-side check on page load

**Hide-my-data (Inferno):**
- Hides phone number from profile
- Shows city only (not estate/area)
- Removes user from explore grid
- User still reachable via DM from existing followers

---

## 5. Database Schema

```sql
-- Users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  email text UNIQUE,
  phone text,
  gender text,
  age int,
  location_city text,
  location_country text DEFAULT 'Kenya',
  bio text,
  avatar_url text,
  interests text[],
  is_verified bool DEFAULT false,
  hide_data bool DEFAULT false,
  tier text DEFAULT 'free',
  tier_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

-- Follows
CREATE TABLE follows (
  follower_id uuid REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Posts
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  caption text,
  media_urls text[],
  is_spicy bool DEFAULT false,
  likes_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Likes
CREATE TABLE likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL, -- post | profile
  target_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- Stories
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  expires_at timestamptz NOT NULL,
  views_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Live Streams
CREATE TABLE streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text,
  stream_key text UNIQUE NOT NULL,
  hls_url text,
  is_live bool DEFAULT false,
  viewer_count int DEFAULT 0,
  started_at timestamptz
);

-- Chaturbate Featured Rooms (admin-curated)
CREATE TABLE chaturbate_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  added_by uuid REFERENCES users(id),
  room_slug text NOT NULL,
  display_name text,
  thumbnail_url text,
  is_featured bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Adult Videos (admin-curated eporner.com embeds)
CREATE TABLE adult_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eporner_id text NOT NULL,
  title text NOT NULL,
  thumbnail_url text,
  category text,
  is_featured bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tier text NOT NULL,
  billing_cycle text NOT NULL, -- monthly | annual
  amount_kes int NOT NULL,
  payment_method text NOT NULL, -- mpesa | bank | crypto
  provider_ref text,
  status text DEFAULT 'pending', -- pending | active | cancelled | expired
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**RLS policies:**
- Messages: sender and recipient only
- `hide_data = true` users excluded from explore queries
- Spicy posts: queryable only by Blaze+ users (enforced at API + RLS)
- Stream keys: never exposed to non-owners

**Seed:** 508 dummy profiles from patachat.com import → `users` table + photos → Cloudflare R2

---

## 6. Payments

### M-Pesa (Daraja STK Push)
1. User enters phone → POST `/api/payments/mpesa/initiate`
2. Daraja sends STK Push to user's phone
3. User enters PIN
4. Safaricom hits `/api/payments/mpesa/callback`
5. Subscription activated

### Pesapal (Bank/Card)
1. POST `/api/payments/pesapal/initiate` → redirect to Pesapal hosted page
2. User pays
3. Pesapal IPN → `/api/payments/pesapal/ipn`
4. Subscription activated

### NOWPayments (Crypto)
1. POST `/api/payments/crypto/initiate` → invoice created with wallet address
2. User pays crypto
3. Webhook → `/api/payments/crypto/webhook`
4. Auto-converted to KES equivalent, subscription activated

### Subscription lifecycle
- On payment success: `status=active`, `ends_at = now + 30d or 365d`, `users.tier` updated
- Daily cron: expire subscriptions past `ends_at`, revert `users.tier = 'free'`

---

## 7. Live Streaming

### ZuriX Live (nginx-rtmp)
- Streamer opens `/go-live` (Inferno only)
- Gets unique RTMP URL: `rtmp://zurix.co.ke/live/{stream_key}`
- Streams via OBS or Larix Broadcaster (free mobile app)
- nginx-rtmp transcodes to HLS: `https://zurix.co.ke/hls/{stream_key}.m3u8`
- Viewers watch via HLS.js player in browser
- `on_publish` webhook → `/api/stream/auth` validates key, sets `is_live=true`
- `on_publish_done` webhook → `/api/stream/end` sets `is_live=false`

**nginx-rtmp config:**
```nginx
rtmp {
  server {
    listen 1935;
    application live {
      live on;
      hls on;
      hls_path /tmp/hls;
      hls_fragment 2s;
      on_publish http://localhost:3000/api/stream/auth;
      on_publish_done http://localhost:3000/api/stream/end;
    }
  }
}
```

### Chaturbate Featured Rooms
- Admin adds room slugs via `/admin`
- `/live` page fetches Chaturbate public affiliates API
- Rooms displayed as cards with thumbnail, viewer count
- Click → Chaturbate embed in modal iframe

---

## 8. Adult Content

### eporner.com Video Section (`/adult`, Blaze+)
- Admin curates video IDs via `/admin` → stored in `adult_videos` table
- Frontend renders standard iframe embeds: `<iframe src="https://www.eporner.com/embed/{eporner_id}/" />`
- No content downloaded or re-hosted
- Category filter bar: All, Kenyan, Ebony, Amateur, etc.
- Hard age gate (18+ wall) on every page load

### User Spicy Content (`/spicy`, Blaze+)
- Registered users post photos/short video clips marked `is_spicy=true`
- Stored in Cloudflare R2, served via CDN
- Age gate on entry
- Admin moderation queue in `/admin`

---

## 9. Project Structure

```
zurix/
├── app/
│   ├── (auth)/login/ | register/
│   ├── (app)/explore/ | profile/[username]/ | posts/ | stories/
│   │         spicy/ | adult/ | live/ | go-live/ | chat/
│   │         payments/ | settings/
│   ├── admin/
│   └── api/
│       ├── payments/mpesa/ | pesapal/ | crypto/
│       ├── stream/auth/ | end/
│       ├── upload/
│       └── subscribe/
├── components/
│   ├── explore/ | profile/ | stories/ | live/ | adult/ | chat/
│   ├── payments/TierCard.tsx
│   └── ui/
├── lib/
│   ├── supabase.ts | r2.ts | daraja.ts | pesapal.ts
│   ├── nowpayments.ts | tiers.ts
├── supabase/migrations/001_initial.sql
├── scripts/seed.ts
└── .env.local
```

---

## 10. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CF_ACCOUNT_ID=
CF_R2_ACCESS_KEY=
CF_R2_SECRET_KEY=
CF_R2_BUCKET=zurix-media

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
STREAM_AUTH_SECRET=
```

---

## 11. Deployment

```bash
# boss-server setup
git clone git@github.com:KE-NETIZEN-OOPS/zurix.git
cd zurix && pnpm install && pnpm build
pm2 start pnpm --name zurix -- start -- --port 3000

# nginx: proxy 80→3000, serve /hls static
# nginx-rtmp: compile with nginx-rtmp-module, listen 1935
# Supabase: supabase db push
# Seed: npx tsx scripts/seed.ts
```

---

## Definition of Done

- [ ] All pages render, tier gates enforced
- [ ] M-Pesa STK Push completes end-to-end in sandbox
- [ ] User can upload photo → appears in explore grid
- [ ] Story posts and auto-expires at 24h
- [ ] Streamer can go live via OBS → viewer sees HLS stream on `/live`
- [ ] Chaturbate rooms load on `/live`
- [ ] eporner.com embeds load on `/adult`
- [ ] Spicy feed hidden from free/Flame users
- [ ] hide-my-data removes user from explore
- [ ] 508 seed profiles visible in explore
- [ ] Repo pushed to `KE-NETIZEN-OOPS/zurix`

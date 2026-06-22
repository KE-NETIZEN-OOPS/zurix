-- ============================================================
-- 003: profile themes, phone requests, music, video posts/stories
-- ============================================================

-- Profile theme preset (dark | midnight | rose | gold | ocean | light)
alter table public.users add column if not exists theme text not null default 'dark';

-- Posts: support video + attached music
alter table public.posts add column if not exists media_type text not null default 'image';
alter table public.posts add column if not exists music_url text;
alter table public.posts add column if not exists music_title text;

-- Stories: support video, music, caption
alter table public.stories add column if not exists media_type text not null default 'image';
alter table public.stories add column if not exists music_url text;
alter table public.stories add column if not exists music_title text;
alter table public.stories add column if not exists caption text;

-- ------------------------------------------------------------
-- Phone number requests: requester asks target to share number
-- ------------------------------------------------------------
create table if not exists public.phone_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.users(id) on delete cascade,
  target_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(requester_id, target_id)
);
alter table public.phone_requests enable row level security;
create policy "Users see their phone requests" on public.phone_requests
  for select using (auth.uid() = requester_id or auth.uid() = target_id);
create policy "Users create phone requests" on public.phone_requests
  for insert with check (auth.uid() = requester_id);
create policy "Targets respond to phone requests" on public.phone_requests
  for update using (auth.uid() = target_id);

-- ------------------------------------------------------------
-- Music tracks: curated library + user uploads
-- ------------------------------------------------------------
create table if not exists public.music_tracks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  artist text not null default 'Unknown',
  url text not null,
  duration_secs integer default 0,
  is_library boolean not null default false,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.music_tracks enable row level security;
create policy "Library + own tracks visible" on public.music_tracks
  for select using (is_library = true or auth.uid() = uploaded_by);
create policy "Users upload own tracks" on public.music_tracks
  for insert with check (auth.uid() = uploaded_by);

-- Seed a curated royalty-free library. SoundHelix tracks are reliably
-- hotlinkable for cross-origin <audio> playback (Mixkit previews block it).
insert into public.music_tracks (title, artist, url, duration_secs, is_library) values
  ('Vibe One', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 30, true),
  ('Night Drive', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 30, true),
  ('Golden Hour', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 30, true),
  ('Slow Burn', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 30, true),
  ('City Lights', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 30, true),
  ('Heatwave', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 30, true),
  ('Afterglow', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', 30, true),
  ('Moonlit', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', 30, true),
  ('Pulse', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', 30, true),
  ('Daydream', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', 30, true),
  ('Velvet', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', 30, true),
  ('Skyline', 'SoundHelix', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', 30, true)
on conflict do nothing;

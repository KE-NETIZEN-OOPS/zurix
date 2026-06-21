-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  email text,
  phone text,
  age integer,
  gender text,
  bio text,
  avatar_url text,
  location_city text,
  interests text[] default '{}',
  looking_for text,
  tier text not null default 'free' check (tier in ('free', 'flame', 'blaze', 'inferno')),
  hide_data boolean not null default false,
  is_verified boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "Users can read non-hidden profiles" on public.users for select using (hide_data = false or auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Follows
create table if not exists public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);
alter table public.follows enable row level security;
create policy "Follows visible to all" on public.follows for select using (true);
create policy "Users manage own follows" on public.follows for all using (auth.uid() = follower_id);

-- Posts
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  caption text,
  media_urls text[] default '{}',
  is_spicy boolean not null default false,
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "Public posts visible to all" on public.posts for select using (is_spicy = false or exists(select 1 from public.users where id = auth.uid() and tier in ('blaze','inferno')));
create policy "Users manage own posts" on public.posts for all using (auth.uid() = user_id);

-- Likes
create table if not exists public.likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, target_type, target_id)
);
alter table public.likes enable row level security;
create policy "Likes visible to all" on public.likes for select using (true);
create policy "Users manage own likes" on public.likes for all using (auth.uid() = user_id);

-- Function to increment post likes
create or replace function public.increment_likes(post_id uuid)
returns void language sql as $$
  update public.posts set likes_count = likes_count + 1 where id = post_id;
$$;

-- Stories
create table if not exists public.stories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  media_url text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.stories enable row level security;
create policy "Stories visible to all logged in" on public.stories for select using (auth.uid() is not null and expires_at > now());
create policy "Users manage own stories" on public.stories for all using (auth.uid() = user_id);

-- Streams
create table if not exists public.streams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'Live Stream',
  stream_key text unique,
  hls_url text,
  thumbnail_url text,
  viewer_count integer not null default 0,
  is_live boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id)
);
alter table public.streams enable row level security;
create policy "Live streams visible to all" on public.streams for select using (is_live = true);
create policy "Users manage own stream" on public.streams for all using (auth.uid() = user_id);

-- Chaturbate rooms
create table if not exists public.chaturbate_rooms (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  display_name text not null,
  preview_url text,
  viewers integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.chaturbate_rooms enable row level security;
create policy "Active rooms visible to inferno" on public.chaturbate_rooms for select using (is_active = true and exists(select 1 from public.users where id = auth.uid() and tier = 'inferno'));
create policy "Admins manage rooms" on public.chaturbate_rooms for all using (exists(select 1 from public.users where id = auth.uid() and is_admin = true));

-- Adult videos
create table if not exists public.adult_videos (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  embed_url text not null,
  thumbnail_url text,
  duration_secs integer default 0,
  tags text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.adult_videos enable row level security;
create policy "Videos visible to blaze+" on public.adult_videos for select using (is_active = true and exists(select 1 from public.users where id = auth.uid() and tier in ('blaze','inferno')));
create policy "Admins manage videos" on public.adult_videos for all using (exists(select 1 from public.users where id = auth.uid() and is_admin = true));

-- Messages
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "Users see own messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users send messages" on public.messages for insert with check (auth.uid() = sender_id);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  tier text not null,
  billing_cycle text not null check (billing_cycle in ('monthly', 'annual')),
  amount_kes integer not null,
  payment_method text not null check (payment_method in ('mpesa', 'card', 'crypto')),
  status text not null default 'pending' check (status in ('pending', 'active', 'failed', 'cancelled')),
  reference text unique not null,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "Users see own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "System inserts subscriptions" on public.subscriptions for insert with check (auth.uid() = user_id);

-- Trigger: update users.updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger users_updated_at before update on public.users for each row execute function public.handle_updated_at();

-- Realtime for messages
alter publication supabase_realtime add table public.messages;

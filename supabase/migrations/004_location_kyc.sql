-- ============================================================
-- 004: geolocation (nearest-first explore) + Persona KYC fields
-- ============================================================

alter table public.users add column if not exists latitude double precision;
alter table public.users add column if not exists longitude double precision;
alter table public.users add column if not exists country text not null default 'Kenya';
-- how the verified tick was earned: 'photo' (fallback) | 'persona'
alter table public.users add column if not exists verified_via text;
alter table public.users add column if not exists persona_inquiry_id text;

create index if not exists users_lat_lng_idx on public.users (latitude, longitude);

-- Grant admin to a user by email (run manually after first signup):
--   UPDATE public.users SET is_admin = true WHERE email = 'your@email.com';

-- Admin checks must NOT query public.users from inside a policy ON public.users,
-- or Postgres raises "infinite recursion detected in policy". Use a
-- SECURITY DEFINER helper that bypasses RLS for the lookup instead.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.users where id = uid), false);
$$;

-- Admins can read every post (base policy already exposes non-spicy posts).
-- This references a DIFFERENT table's helper, so no recursion on posts.
drop policy if exists "Admins read all posts" on public.posts;
create policy "Admins read all posts" on public.posts
  for select using (public.is_admin(auth.uid()));

-- NOTE: We intentionally do NOT add an "admins read all users" policy.
-- A user can already read their own row (auth.uid() = id) via the base
-- policy in 001_initial.sql, which is all the admin-check API route needs.
-- Full admin user listings should go through the service-role key.

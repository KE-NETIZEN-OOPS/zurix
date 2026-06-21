-- Grant admin to first user by email (run manually after first signup)
-- UPDATE public.users SET is_admin = true WHERE email = 'your@email.com';

-- Admin bypass policies (admins can read everything)
create policy "Admins read all users" on public.users for select using (
  exists(select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
);

create policy "Admins read all posts" on public.posts for select using (
  exists(select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
);

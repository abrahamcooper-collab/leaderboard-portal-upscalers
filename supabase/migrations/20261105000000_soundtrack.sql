-- A background soundtrack for the TV pages, chosen by an admin.

-- App-wide settings: exactly one row (the primary key can only be true).
create table public.app_settings (
  id              boolean primary key default true check (id),
  -- Object path in the `soundtracks` bucket; null = no soundtrack.
  soundtrack_path text,
  updated_at      timestamptz not null default now()
);
insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;
create policy "signed-in users read settings" on public.app_settings
  for select to authenticated using (true);
create policy "admins update settings" on public.app_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Earlier grants covered only the tables that existed then.
grant select, update on public.app_settings to authenticated;

-- Soundtracks: public read (played on the TVs), admin-only write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'soundtracks', 'soundtracks', true, 31457280,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm']
)
on conflict (id) do nothing;

create policy "admins upload soundtracks" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'soundtracks' and public.is_admin());
create policy "admins update soundtracks" on storage.objects
  for update to authenticated
  using (bucket_id = 'soundtracks' and public.is_admin());
create policy "admins delete soundtracks" on storage.objects
  for delete to authenticated
  using (bucket_id = 'soundtracks' and public.is_admin());
create policy "signed-in users read soundtracks" on storage.objects
  for select to authenticated
  using (bucket_id = 'soundtracks');

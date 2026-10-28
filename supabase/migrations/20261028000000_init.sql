-- Sales portal schema.
--
-- Model: one closer owns exactly one team; a team has many agents; a sale
-- belongs to one agent (team and closer are derived through the agent, never
-- stored twice). Totals are never stored — they are computed from `sales` so
-- editing or deleting a sale can't leave a stale total behind.

create type public.user_role as enum ('admin', 'closer');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null check (length(trim(full_name)) > 0),
  phone      text,
  role       public.user_role not null,
  created_at timestamptz not null default now()
);

create table public.teams (
  id                     uuid primary key default gen_random_uuid(),
  closer_id              uuid not null unique references public.profiles (id) on delete cascade,
  name                   text not null check (length(trim(name)) > 0),
  -- Object path inside the `celebration-videos` bucket; null = no video set.
  celebration_video_path text,
  created_at             timestamptz not null default now()
);

create table public.agents (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  phone      text,
  created_at timestamptz not null default now()
);
create index agents_team_id_idx on public.agents (team_id);

-- A target applies from its month onward until a later month overrides it,
-- so admins only re-enter targets when they actually change.
create table public.monthly_targets (
  agent_id uuid not null references public.agents (id) on delete cascade,
  month    date not null check (month = date_trunc('month', month)::date),
  amount   numeric(12, 2) not null check (amount >= 0),
  primary key (agent_id, month)
);

create table public.sales (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.agents (id) on delete cascade,
  amount     numeric(12, 2) not null check (amount > 0),
  sold_at    timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index sales_agent_sold_at_idx on public.sales (agent_id, sold_at);
create index sales_sold_at_idx on public.sales (sold_at desc);

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so policies on `profiles` can call it without recursing
-- into their own RLS checks.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: every signed-in user can read (the board shows all
-- teams); only admins write, except closers may edit their own agents.
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.teams           enable row level security;
alter table public.agents          enable row level security;
alter table public.monthly_targets enable row level security;
alter table public.sales           enable row level security;

create policy "signed-in users read profiles" on public.profiles
  for select to authenticated using (true);
create policy "admins write profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "signed-in users read teams" on public.teams
  for select to authenticated using (true);
create policy "admins write teams" on public.teams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "signed-in users read agents" on public.agents
  for select to authenticated using (true);
create policy "admins write agents" on public.agents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- WITH CHECK runs on the new row, so a closer can't move an agent to another team.
create policy "closers update own agents" on public.agents
  for update to authenticated
  using (exists (
    select 1 from public.teams t
    where t.id = agents.team_id and t.closer_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.teams t
    where t.id = agents.team_id and t.closer_id = (select auth.uid())
  ));

create policy "signed-in users read targets" on public.monthly_targets
  for select to authenticated using (true);
create policy "admins write targets" on public.monthly_targets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "signed-in users read sales" on public.sales
  for select to authenticated using (true);
create policy "admins write sales" on public.sales
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Explicit grants so the schema works regardless of the project's default
-- Data API privileges. Nothing is exposed to anonymous visitors.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Functions called by the app (SECURITY INVOKER: the caller's RLS applies)
-- ---------------------------------------------------------------------------

-- Creates the profile + team for an auth user in one transaction.
create function public.create_closer(
  p_user_id   uuid,
  p_full_name text,
  p_phone     text,
  p_team_name text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  insert into public.profiles (id, full_name, phone, role)
  values (p_user_id, p_full_name, p_phone, 'closer');

  insert into public.teams (closer_id, name)
  values (p_user_id, p_team_name)
  returning id into v_team_id;

  return v_team_id;
end;
$$;

-- Updates a closer's profile and team name together.
create function public.update_closer(
  p_team_id   uuid,
  p_full_name text,
  p_phone     text,
  p_team_name text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_closer_id uuid;
begin
  update public.teams set name = p_team_name
  where id = p_team_id
  returning closer_id into v_closer_id;

  if v_closer_id is null then
    raise exception 'Team % not found or not permitted', p_team_id;
  end if;

  update public.profiles set full_name = p_full_name, phone = p_phone
  where id = v_closer_id;
end;
$$;

-- One row per agent (or one row with null agent fields for an empty team)
-- with the agent's effective target and sales within the given month.
-- `p_month` is the first day of the month; `p_tz` decides where the month
-- boundary falls (e.g. a sale at 11pm on the 31st).
create function public.leaderboard(p_month date, p_tz text)
returns table (
  team_id     uuid,
  team_name   text,
  closer_name text,
  agent_id    uuid,
  agent_name  text,
  target      numeric,
  sales_count integer,
  sales_total numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with bounds as (
    select
      (p_month::timestamp at time zone p_tz)                      as starts_at,
      ((p_month + interval '1 month')::timestamp at time zone p_tz) as ends_at
  ),
  month_sales as (
    select s.agent_id, count(*)::integer as sales_count, sum(s.amount) as sales_total
    from public.sales s, bounds b
    where s.sold_at >= b.starts_at and s.sold_at < b.ends_at
    group by s.agent_id
  )
  select
    t.id, t.name, p.full_name, a.id, a.name,
    tg.amount,
    coalesce(ms.sales_count, 0),
    coalesce(ms.sales_total, 0)
  from public.teams t
  join public.profiles p on p.id = t.closer_id
  left join public.agents a on a.team_id = t.id
  left join lateral (
    select mt.amount from public.monthly_targets mt
    where mt.agent_id = a.id and mt.month <= p_month
    order by mt.month desc
    limit 1
  ) tg on true
  left join month_sales ms on ms.agent_id = a.id;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: the board listens for new sales to trigger the celebration.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.sales;

-- ---------------------------------------------------------------------------
-- Storage: celebration videos. Public read (played on the board TV),
-- admin-only write. 50 MB matches the Supabase free-plan upload cap.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'celebration-videos', 'celebration-videos', true, 52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do nothing;

create policy "admins upload videos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'celebration-videos' and public.is_admin());
create policy "admins update videos" on storage.objects
  for update to authenticated
  using (bucket_id = 'celebration-videos' and public.is_admin());
create policy "admins delete videos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'celebration-videos' and public.is_admin());
create policy "signed-in users read videos" on storage.objects
  for select to authenticated
  using (bucket_id = 'celebration-videos');

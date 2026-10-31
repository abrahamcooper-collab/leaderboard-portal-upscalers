-- Sales Floor: per-team colour and avatar (bitmoji) slots for closers and agents.

alter table public.teams
  add column color text not null default 'gray'
    check (color in ('gray', 'cyan', 'gold', 'red', 'blue', 'green', 'purple'));

-- Object paths inside the `avatars` bucket; null = show initials.
alter table public.profiles add column avatar_path text;
alter table public.agents   add column avatar_path text;

-- create_closer / update_closer gain a colour parameter, which changes their
-- signatures, so the old versions are dropped.
drop function public.create_closer(uuid, text, text, text);
drop function public.update_closer(uuid, text, text, text);

create function public.create_closer(
  p_user_id   uuid,
  p_full_name text,
  p_phone     text,
  p_team_name text,
  p_color     text
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

  insert into public.teams (closer_id, name, color)
  values (p_user_id, p_team_name, p_color)
  returning id into v_team_id;

  return v_team_id;
end;
$$;

create function public.update_closer(
  p_team_id   uuid,
  p_full_name text,
  p_phone     text,
  p_team_name text,
  p_color     text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_closer_id uuid;
begin
  update public.teams set name = p_team_name, color = p_color
  where id = p_team_id
  returning closer_id into v_closer_id;

  if v_closer_id is null then
    raise exception 'Team % not found or not permitted', p_team_id;
  end if;

  update public.profiles set full_name = p_full_name, phone = p_phone
  where id = v_closer_id;
end;
$$;

drop function public.leaderboard(date, text);

-- Unchanged logic; now also returns the team colour and avatar paths.
create function public.leaderboard(p_month date, p_tz text)
returns table (
  team_id            uuid,
  team_name          text,
  team_color         text,
  closer_name        text,
  closer_avatar_path text,
  agent_id           uuid,
  agent_name         text,
  agent_avatar_path  text,
  agent_archived     boolean,
  target             numeric,
  sales_count        integer,
  sales_total        numeric
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
  ),
  visible_agents as (
    select a.id, a.team_id, a.name, a.avatar_path, a.archived_at is not null as archived,
           ms.sales_count, ms.sales_total
    from public.agents a
    left join month_sales ms on ms.agent_id = a.id
    where a.archived_at is null or ms.agent_id is not null
  )
  select
    t.id, t.name, t.color, p.full_name, p.avatar_path,
    va.id, va.name, va.avatar_path, va.archived,
    tg.amount,
    coalesce(va.sales_count, 0),
    coalesce(va.sales_total, 0)
  from public.teams t
  join public.profiles p on p.id = t.closer_id
  left join visible_agents va on va.team_id = t.id
  left join lateral (
    select mt.amount from public.monthly_targets mt
    where mt.agent_id = va.id and mt.month <= p_month
    order by mt.month desc
    limit 1
  ) tg on true
  where t.archived_at is null;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- Avatars: public read (shown on the Sales Floor TV), admin-only write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "admins upload avatars" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_admin());
create policy "admins update avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.is_admin());
create policy "admins delete avatars" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.is_admin());
create policy "signed-in users read avatars" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

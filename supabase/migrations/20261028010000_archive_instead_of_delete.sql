-- Removing an agent or closer archives them instead of deleting rows, so
-- sales history is never lost. Foreign keys are switched from CASCADE to
-- RESTRICT so a hard delete (e.g. from the dashboard) fails instead of
-- silently taking sales with it.

alter table public.agents add column archived_at timestamptz;
alter table public.teams  add column archived_at timestamptz;

alter table public.sales
  drop constraint sales_agent_id_fkey,
  add constraint sales_agent_id_fkey
    foreign key (agent_id) references public.agents (id) on delete restrict;

alter table public.agents
  drop constraint agents_team_id_fkey,
  add constraint agents_team_id_fkey
    foreign key (team_id) references public.teams (id) on delete restrict;

alter table public.teams
  drop constraint teams_closer_id_fkey,
  add constraint teams_closer_id_fkey
    foreign key (closer_id) references public.profiles (id) on delete restrict;

-- Archives a team and all its agents together.
create function public.archive_team(p_team_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_closer_id uuid;
begin
  update public.teams set archived_at = now()
  where id = p_team_id and archived_at is null
  returning closer_id into v_closer_id;

  if v_closer_id is null then
    raise exception 'Team % not found, already removed, or not permitted', p_team_id;
  end if;

  update public.agents set archived_at = now()
  where team_id = p_team_id and archived_at is null;

  return v_closer_id;
end;
$$;

-- The return type changes, so the function must be dropped and recreated.
drop function public.leaderboard(date, text);

-- Same as before, except: archived teams are left out, and an archived agent
-- is still listed for a month in which they made sales, so the agent rows
-- always add up to the team total.
create function public.leaderboard(p_month date, p_tz text)
returns table (
  team_id        uuid,
  team_name      text,
  closer_name    text,
  agent_id       uuid,
  agent_name     text,
  agent_archived boolean,
  target         numeric,
  sales_count    integer,
  sales_total    numeric
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
    select a.id, a.team_id, a.name, a.archived_at is not null as archived,
           ms.sales_count, ms.sales_total
    from public.agents a
    left join month_sales ms on ms.agent_id = a.id
    where a.archived_at is null or ms.agent_id is not null
  )
  select
    t.id, t.name, p.full_name, va.id, va.name, va.archived,
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

-- Closers can set monthly targets for, and record sales by, the active agents
-- on their own team. Admins keep their existing full access.

-- SECURITY DEFINER for the same reason as is_admin(): the policies below call
-- it, and it reads agents and teams.
create function public.is_own_active_agent(p_agent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.agents a
    join public.teams t on t.id = a.team_id
    where a.id = p_agent_id
      and a.archived_at is null
      and t.archived_at is null
      and t.closer_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_own_active_agent(uuid) from public, anon;
grant execute on function public.is_own_active_agent(uuid) to authenticated;

-- Setting a target is an upsert (insert ... on conflict do update), so it needs both.
create policy "closers insert own targets" on public.monthly_targets
  for insert to authenticated
  with check (public.is_own_active_agent(agent_id));
create policy "closers update own targets" on public.monthly_targets
  for update to authenticated
  using (public.is_own_active_agent(agent_id))
  with check (public.is_own_active_agent(agent_id));

-- created_by must be the closer, so every sale shows who entered it.
create policy "closers record own sales" on public.sales
  for insert to authenticated
  with check (public.is_own_active_agent(agent_id) and created_by = (select auth.uid()));

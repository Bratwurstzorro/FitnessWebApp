-- Global exercise identity; plan instances and their target sets stay separate.
create table public.training_exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.training_exercise_catalog enable row level security;
create policy training_catalog_read on public.training_exercise_catalog
  for select to authenticated using (true);
create policy training_catalog_add on public.training_exercise_catalog
  for insert to authenticated with check ((select auth.uid()) = created_by);
revoke all on public.training_exercise_catalog from anon;
grant select,insert on public.training_exercise_catalog to authenticated;

-- Exact spelling only: no case folding or fuzzy merging of distinct exercises.
insert into public.training_exercise_catalog (name)
select name from public.training_exercises
union
select exercise_name from public.training_session_sets;

alter table public.training_exercises
  add column catalog_exercise_id uuid references public.training_exercise_catalog(id);
alter table public.training_session_sets
  add column catalog_exercise_id uuid references public.training_exercise_catalog(id);

update public.training_exercises e set catalog_exercise_id = c.id
  from public.training_exercise_catalog c where e.name = c.name;
update public.training_session_sets s set catalog_exercise_id = c.id
  from public.training_exercise_catalog c where s.exercise_name = c.name;

create index training_exercises_catalog_idx on public.training_exercises(user_id,catalog_exercise_id);
create index training_session_sets_catalog_idx
  on public.training_session_sets(user_id,catalog_exercise_id,completed_at desc);

-- Replaces the existing invoker function; syncing a day retains catalog IDs.
create or replace function public.finish_training_and_update_plan(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.training_sessions%rowtype;
  v_group record;
  v_set record;
  v_exercise_id uuid;
  v_catalog_id uuid;
  v_kept uuid[] := array[]::uuid[];
  v_position integer := 0;
  v_set_position integer;
begin
  select * into v_session from public.training_sessions
    where id = p_session_id and user_id = (select auth.uid()) and finished_at is null
    for update;
  if not found then raise exception 'Training nicht gefunden oder bereits abgeschlossen'; end if;
  if v_session.source_day_id is null or not exists (
    select 1 from public.training_days d join public.training_plans p
      on p.id = d.plan_id and p.user_id = d.user_id
    where d.id = v_session.source_day_id and d.plan_id = v_session.source_plan_id
      and d.user_id = (select auth.uid())
  ) then raise exception 'Ursprünglicher Trainingstag ist nicht mehr vorhanden'; end if;
  if not exists (select 1 from public.training_session_sets where session_id = p_session_id and user_id = (select auth.uid()))
    or exists (select 1 from public.training_session_sets where session_id = p_session_id and user_id = (select auth.uid()) and completed_at is null)
  then raise exception 'Bitte zuerst alle Sätze abschließen'; end if;

  for v_group in
    select distinct on (exercise_position) exercise_position, exercise_id,
      catalog_exercise_id, exercise_name, rest_seconds
    from public.training_session_sets where session_id = p_session_id and user_id = (select auth.uid())
    order by exercise_position, set_position
  loop
    v_catalog_id := v_group.catalog_exercise_id;
    if v_catalog_id is null then
      select id into v_catalog_id from public.training_exercise_catalog
        where name = v_group.exercise_name;
    end if;
    if v_catalog_id is null then
      insert into public.training_exercise_catalog(name,created_by)
        values(v_group.exercise_name,(select auth.uid()))
        on conflict(name) do nothing returning id into v_catalog_id;
      if v_catalog_id is null then
        select id into v_catalog_id from public.training_exercise_catalog
          where name = v_group.exercise_name;
      end if;
    end if;
    select id into v_exercise_id from public.training_exercises
      where id = v_group.exercise_id and day_id = v_session.source_day_id
        and user_id = (select auth.uid()) and not (id = any(v_kept));
    if v_exercise_id is null then
      insert into public.training_exercises
        (user_id,day_id,name,position,rest_seconds,catalog_exercise_id)
        values ((select auth.uid()),v_session.source_day_id,v_group.exercise_name,
          v_position,v_group.rest_seconds,v_catalog_id)
        returning id into v_exercise_id;
    else
      update public.training_exercises set name = v_group.exercise_name,
        position = v_position, rest_seconds = v_group.rest_seconds,
        catalog_exercise_id = v_catalog_id where id = v_exercise_id;
    end if;
    v_kept := array_append(v_kept,v_exercise_id);
    delete from public.training_targets where exercise_id = v_exercise_id and user_id = (select auth.uid());
    v_set_position := 0;
    for v_set in
      select actual_weight_kg,actual_reps from public.training_session_sets
      where session_id = p_session_id and exercise_position = v_group.exercise_position
        and user_id = (select auth.uid()) order by set_position
    loop
      insert into public.training_targets (user_id,exercise_id,position,weight_kg,reps)
        values ((select auth.uid()),v_exercise_id,v_set_position,v_set.actual_weight_kg,
          greatest(v_set.actual_reps,1));
      v_set_position := v_set_position + 1;
    end loop;
    update public.training_session_sets set exercise_id = v_exercise_id,
      catalog_exercise_id = v_catalog_id
      where session_id = p_session_id and exercise_position = v_group.exercise_position
        and user_id = (select auth.uid());
    v_position := v_position + 1;
    v_exercise_id := null;
  end loop;
  delete from public.training_exercises where day_id = v_session.source_day_id
    and user_id = (select auth.uid()) and not (id = any(v_kept));
  update public.training_sessions set finished_at = now()
    where id = p_session_id and user_id = (select auth.uid());
end;
$$;

revoke all on function public.finish_training_and_update_plan(uuid) from public, anon;
grant execute on function public.finish_training_and_update_plan(uuid) to authenticated;

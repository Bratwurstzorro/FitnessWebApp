-- Keep origin IDs without foreign keys: history must survive plan deletion.
alter table public.training_sessions add column if not exists source_plan_id uuid;
alter table public.training_sessions add column if not exists source_day_id uuid;

-- One transaction: finish the workout and copy exactly today's exercise/set order
-- into the originating day. SECURITY INVOKER preserves all six tables' RLS.
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
    select distinct on (exercise_position) exercise_position, exercise_id, exercise_name, rest_seconds
    from public.training_session_sets where session_id = p_session_id and user_id = (select auth.uid())
    order by exercise_position, set_position
  loop
    select id into v_exercise_id from public.training_exercises
      where id = v_group.exercise_id and day_id = v_session.source_day_id and user_id = (select auth.uid())
        and not (id = any(v_kept));
    if v_exercise_id is null then
      insert into public.training_exercises (user_id,day_id,name,position,rest_seconds)
        values ((select auth.uid()),v_session.source_day_id,v_group.exercise_name,v_position,v_group.rest_seconds)
        returning id into v_exercise_id;
    else
      update public.training_exercises set name = v_group.exercise_name,
        position = v_position, rest_seconds = v_group.rest_seconds where id = v_exercise_id;
    end if;
    v_kept := array_append(v_kept,v_exercise_id);
    delete from public.training_targets where exercise_id = v_exercise_id and user_id = (select auth.uid());
    v_set_position := 0;
    for v_set in
      select actual_weight_kg,actual_reps from public.training_session_sets
      where session_id = p_session_id and exercise_position = v_group.exercise_position and user_id = (select auth.uid())
      order by set_position
    loop
      insert into public.training_targets (user_id,exercise_id,position,weight_kg,reps)
        values ((select auth.uid()),v_exercise_id,v_set_position,v_set.actual_weight_kg,greatest(v_set.actual_reps,1));
      v_set_position := v_set_position + 1;
    end loop;
    -- Newly added exercises receive their permanent plan ID for future comparisons.
    update public.training_session_sets set exercise_id = v_exercise_id
      where session_id = p_session_id and exercise_position = v_group.exercise_position and user_id = (select auth.uid());
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

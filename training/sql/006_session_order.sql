-- Atomic reordering avoids the unique session/exercise/set-position constraint.
-- Invoker privileges retain the existing ownership RLS on both tables.
create or replace function public.reorder_training_session(p_session_id uuid,p_items jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  row_count integer;
  offset_position integer;
begin
  if auth.uid() is null then raise exception 'Anmeldung erforderlich'; end if;
  perform 1 from public.training_sessions where id=p_session_id and user_id=auth.uid() for update;
  if not found then raise exception 'Training nicht gefunden'; end if;
  perform 1 from public.training_session_sets where session_id=p_session_id and user_id=auth.uid() for update;
  select count(*),coalesce(max(exercise_position),0)+1 into row_count,offset_position
    from public.training_session_sets where session_id=p_session_id and user_id=auth.uid();
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Ungültige Reihenfolge'; end if;
  if jsonb_array_length(p_items)<>row_count or
    (select count(distinct id) from jsonb_to_recordset(p_items) as x(id uuid))<>row_count or
    exists(select 1 from jsonb_to_recordset(p_items) as x(id uuid,exercise_position integer,set_position integer)
      where x.exercise_position is null or x.set_position is null or x.exercise_position<0 or x.set_position<0
        or x.exercise_position>=greatest(row_count,1) or x.set_position>=greatest(row_count,1)
        or not exists(select 1 from public.training_session_sets s where s.id=x.id and s.session_id=p_session_id and s.user_id=auth.uid()))
    then raise exception 'Reihenfolge unvollständig oder veraltet. Bitte neu laden.'; end if;
  -- All old positions move out of the destination range before assigning the new ones.
  offset_position:=offset_position+row_count;
  update public.training_session_sets set exercise_position=exercise_position+offset_position
    where session_id=p_session_id and user_id=auth.uid();
  update public.training_session_sets s set exercise_position=x.exercise_position,set_position=x.set_position
    from jsonb_to_recordset(p_items) as x(id uuid,exercise_position integer,set_position integer)
    where s.id=x.id and s.session_id=p_session_id and s.user_id=auth.uid();
end;
$$;
revoke all on function public.reorder_training_session(uuid,jsonb) from public,anon;
grant execute on function public.reorder_training_session(uuid,jsonb) to authenticated;

-- Restore pre-range plan goals that were masked by the new 10–10 default.
-- Explicitly configured non-default ranges remain untouched.
update public.training_exercises e set rep_min=t.lo,rep_max=t.hi
from (select exercise_id,min(reps) lo,max(reps) hi from public.training_targets group by exercise_id) t
where e.id=t.exercise_id and e.rep_min=10 and e.rep_max=10 and (t.lo<>10 or t.hi<>10);
-- Existing history retains the original planned rep goals, not achieved reps.
update public.training_session_sets s set rep_min=t.lo,rep_max=t.hi
from (select session_id,exercise_position,min(target_reps) lo,max(target_reps) hi
from public.training_session_sets group by session_id,exercise_position) t
where s.session_id=t.session_id and s.exercise_position=t.exercise_position
and s.rep_min=10 and s.rep_max=10 and (t.lo<>10 or t.hi<>10);
-- Repair a workout opened while its original plan was masked by the default.
update public.training_session_sets s set rep_min=e.rep_min,rep_max=e.rep_max,target_reps=e.rep_min
from public.training_exercises e,public.training_sessions w
where s.exercise_id=e.id and s.user_id=e.user_id and w.id=s.session_id and w.finished_at is null
and s.rep_min=10 and s.rep_max=10 and (e.rep_min<>10 or e.rep_max<>10);

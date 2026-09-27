-- Associate legacy sessions only when their plan/day name pair resolves to
-- exactly one owned day. Ambiguous matches remain unlinked.
with matching as (
  select s.id as session_id, array_agg(p.id) as plan_ids, array_agg(d.id) as day_ids
  from public.training_sessions s
  join public.training_plans p on p.user_id = s.user_id and p.name = s.plan_name
  join public.training_days d on d.user_id = s.user_id and d.plan_id = p.id and d.name = s.day_name
  where s.source_day_id is null
  group by s.id
  having count(*) = 1
)
update public.training_sessions s
set source_plan_id = m.plan_ids[1], source_day_id = m.day_ids[1]
from matching m where s.id = m.session_id;

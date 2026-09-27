-- Isolated training feature; public.measurements and existing auth remain untouched.
create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (user_id,id)
);
create table if not exists public.training_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  plan_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  position integer not null default 0 check (position >= 0),
  unique (user_id,id),
  foreign key (user_id,plan_id) references public.training_plans(user_id,id) on delete cascade
);
create table if not exists public.training_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  day_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  position integer not null default 0 check (position >= 0),
  rest_seconds integer not null default 120 check (rest_seconds in (60,90,120,180)),
  unique (user_id,id),
  foreign key (user_id,day_id) references public.training_days(user_id,id) on delete cascade
);
create table if not exists public.training_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  exercise_id uuid not null,
  position integer not null check (position >= 0),
  weight_kg numeric(7,2) not null default 0 check (weight_kg between 0 and 9999),
  reps integer not null default 10 check (reps between 1 and 1000),
  foreign key (user_id,exercise_id) references public.training_exercises(user_id,id) on delete cascade
);
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_name text not null,
  day_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (user_id,id)
);
create table if not exists public.training_session_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  session_id uuid not null,
  exercise_id uuid not null,
  exercise_name text not null,
  exercise_position integer not null,
  set_position integer not null,
  rest_seconds integer not null check (rest_seconds in (60,90,120,180)),
  target_weight_kg numeric(7,2) not null check (target_weight_kg between 0 and 9999),
  target_reps integer not null check (target_reps between 1 and 1000),
  actual_weight_kg numeric(7,2) check (actual_weight_kg between 0 and 9999),
  actual_reps integer check (actual_reps between 0 and 1000),
  completed_at timestamptz,
  unique (session_id,exercise_position,set_position),
  check (completed_at is null or (actual_weight_kg is not null and actual_reps is not null)),
  foreign key (user_id,session_id) references public.training_sessions(user_id,id) on delete cascade
);

create index if not exists training_days_plan_idx on public.training_days(user_id,plan_id,position);
create index if not exists training_exercises_day_idx on public.training_exercises(user_id,day_id,position);
create index if not exists training_targets_exercise_idx on public.training_targets(user_id,exercise_id,position);
create index if not exists training_sessions_history_idx on public.training_sessions(user_id,started_at desc);
create index if not exists training_session_sets_session_idx on public.training_session_sets(user_id,session_id,exercise_position,set_position);
create index if not exists training_session_sets_previous_idx on public.training_session_sets(user_id,exercise_id,completed_at desc);

alter table public.training_plans enable row level security;
alter table public.training_days enable row level security;
alter table public.training_exercises enable row level security;
alter table public.training_targets enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_session_sets enable row level security;

do $$
declare tbl text;
begin
  foreach tbl in array array['training_plans','training_days','training_exercises','training_targets','training_sessions','training_session_sets'] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', tbl || '_select', tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', tbl || '_insert', tbl);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', tbl || '_update', tbl);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', tbl || '_delete', tbl);
    execute format('grant select,insert,update,delete on public.%I to authenticated', tbl);
    execute format('revoke all on public.%I from anon', tbl);
  end loop;
end $$;

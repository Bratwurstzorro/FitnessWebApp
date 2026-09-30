-- Null means unrecorded; 3 means at least three repetitions in reserve.
-- Stored on owned session sets, retaining their existing owner-only RLS.
alter table public.training_session_sets add column rir smallint
  constraint training_session_sets_rir_range check (rir between 0 and 3);

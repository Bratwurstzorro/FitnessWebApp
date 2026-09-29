-- Supabase may grant default table privileges to PUBLIC/authenticated.
-- The catalog is append-only for signed-in users; no client can rename or remove it.
revoke all on public.training_exercise_catalog from public, anon, authenticated;
grant select, insert on public.training_exercise_catalog to authenticated;

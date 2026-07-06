-- The "select active models" RLS policy is row-level only — it does not stop
-- anon/authenticated clients from reading model_name/system_prompt columns
-- directly over the REST API. Lock those two columns down to service_role
-- only; the AI Edge Function reads them with the service role key, the
-- public site only ever needs id/name/type/cost/is_active.

revoke select on public.models from anon, authenticated;
grant select (id, name, type, cost, is_active) on public.models to anon, authenticated;

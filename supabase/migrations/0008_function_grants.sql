-- Ligera migration 0008
-- Lock down SECURITY DEFINER functions so the anon role can no longer execute
-- them through /rest/v1/rpc. The RPCs already re-check auth.uid(); this removes
-- the public grant and grants execute only where it is needed.
-- Run once in the Supabase SQL Editor.

-- User-facing RPCs: signed-in users only.
revoke execute on function public.log_workout(uuid, timestamptz, integer, jsonb, text)
  from public, anon;
grant execute on function public.log_workout(uuid, timestamptz, integer, jsonb, text)
  to authenticated, service_role;

revoke execute on function public.update_logged_workout(uuid, integer, jsonb, text)
  from public, anon;
grant execute on function public.update_logged_workout(uuid, integer, jsonb, text)
  to authenticated, service_role;

revoke execute on function public.rename_exercise(text, text)
  from public, anon;
grant execute on function public.rename_exercise(text, text)
  to authenticated, service_role;

-- Trigger-only function: never callable through the API. The signup trigger
-- fires as supabase_auth_admin (SECURITY DEFINER runs as the owner).
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
grant execute on function public.handle_new_user()
  to supabase_auth_admin;

drop function if exists public.consume_ai_quota(integer);

create or replace function public.consume_ai_quota(
  p_daily_limit integer default 20,
  p_kind text default 'classify'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  used integer;
  limit_value integer := greatest(coalesce(p_daily_limit, 20), 1);
  kind_value text := coalesce(nullif(btrim(p_kind), ''), 'classify');
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.ai_requests
   where user_id = uid
     and created_at < now() - interval '30 days';

  select count(*) into used
    from public.ai_requests
   where user_id = uid
     and created_at >= date_trunc('day', now());

  if used >= limit_value then
    return jsonb_build_object('allowed', false, 'remaining', 0);
  end if;

  insert into public.ai_requests (user_id, kind) values (uid, kind_value);

  return jsonb_build_object('allowed', true, 'remaining', limit_value - used - 1);
end;
$$;

revoke execute on function public.consume_ai_quota(integer, text) from public, anon;
grant execute on function public.consume_ai_quota(integer, text) to authenticated, service_role;

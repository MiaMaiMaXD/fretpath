-- Latest practice date per learner for the admin learner list, aggregated in the database
-- so it is not truncated by the API max_rows limit.
create or replace function public.admin_last_practice()
returns table (user_id uuid, last_practiced_on date)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  return query
    select l.user_id, max(l.practiced_on) from public.practice_logs l group by l.user_id;
end $$;

revoke execute on function public.admin_last_practice() from public, anon;
grant execute on function public.admin_last_practice() to authenticated;

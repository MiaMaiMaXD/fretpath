-- Task 8: profiles.avatar_url may only point at the owner's own folder of the public avatars bucket.
-- The column is user-updatable through PostgREST, so the rule is enforced in the database too.
create or replace function public.guard_avatar_url() returns trigger
language plpgsql as $$
begin
  if new.avatar_url is not null
     and new.avatar_url !~ ('^https?://[^/?#]+/storage/v1/object/public/avatars/' || new.id::text || '/[A-Za-z0-9._-]+(\?v=[0-9]+)?$') then
    raise exception 'INVALID_AVATAR' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_avatar_url on public.profiles;
create trigger profiles_guard_avatar_url
  before update of avatar_url on public.profiles
  for each row
  when (new.avatar_url is distinct from old.avatar_url)
  execute function public.guard_avatar_url();

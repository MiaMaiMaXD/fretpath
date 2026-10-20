begin;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'g1@test.local', 'x', now(), '{"provider":"google"}', '{"full_name":"สมชาย ใจดี"}', now(), now(), '', '', '', '')
returning id as u1 \gset
select is((select display_name from profiles where id = :'u1'), 'สมชาย ใจดี', 'test_oauth_full_name_used');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'g2@test.local', 'x', now(), '{}', '{"display_name":"ชื่อเอง","full_name":"สมชาย ใจดี"}', now(), now(), '', '', '', '')
returning id as u2 \gset
select is((select display_name from profiles where id = :'u2'), 'ชื่อเอง', 'test_display_name_still_wins');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'g3@test.local', 'x', now(), '{}', '{}', now(), now(), '', '', '', '')
returning id as u3 \gset
select is((select display_name from profiles where id = :'u3'), 'g3', 'test_email_local_part_fallback');

select * from finish();
rollback;

-- LOCAL / CI ONLY. Never run against production (contains known-password accounts).
-- Test accounts only. Course content lives in content/guitar-basics.sql, which
-- config.toml [db.seed] sql_paths loads first so handle_new_user enrolls these users
-- and unlocks lesson 1.

-- Sections: content files insert lessons after migrations, so the lessons_default_section trigger put
-- them all in one section. Split guitar-basics into its four units (same as the production backfill).
select public.split_course_into_sections(c.id,
  array['จับกีตาร์ครั้งแรก', 'เล่นเพลงแรก', 'เข้าใจคอร์ด', 'ทั่วคอกีตาร์'], array[5, 5, 5, 7])
from public.courses c where c.slug = 'guitar-basics';

-- Example chords for the chord-lab lessons (same as the production backfill in 20261127000025).
update public.lessons set example_chords = array['Em', 'Am', 'C', 'D', 'G', 'F']
  where slug in ('first-chords', 'open-chords-changes', 'strumming-4-4', 'f-chord-first-song');

-- Users (content is loaded first, so handle_new_user enrolls them and unlocks lesson 1)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  u.email, extensions.crypt('Passw0rd!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.name),
  now(), now(), '', '', '', ''
from (values ('admin@fretpath.test', 'Admin'), ('member@fretpath.test', 'Member')) as u(email, name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  now(), now(), now()
from auth.users where email in ('admin@fretpath.test', 'member@fretpath.test');

update public.profiles set role = 'admin'
  where id = (select id from auth.users where email = 'admin@fretpath.test');

-- Draft vs live (2026-11 lesson editor). Editing a published lesson saves a draft ("บันทึกแบบร่าง") that
-- learners do not see; "อัปเดต" copies it into the live tables (lessons / lesson_pages / quiz_*) through
-- admin_save_lesson_editor and drops the draft. The draft is the editor's whole state as JSON, so it
-- can hold new pages and questions that do not have ids yet. Unpublished lessons are saved straight
-- to the live tables (nobody sees them), so they never have a draft.

create table public.lesson_drafts (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  data jsonb not null constraint lesson_drafts_data_object check (jsonb_typeof(data) = 'object'),
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_drafts_size check (pg_column_size(data) <= 2000000)
);

create trigger lesson_drafts_set_updated_at before update on public.lesson_drafts
  for each row execute function public.set_updated_at();

-- admins only; learners never read drafts
grant select, insert, update, delete on public.lesson_drafts to authenticated;
alter table public.lesson_drafts enable row level security;
create policy lesson_drafts_admin_all on public.lesson_drafts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

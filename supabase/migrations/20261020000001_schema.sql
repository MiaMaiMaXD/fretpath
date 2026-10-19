-- Core schema (spec 4.2). RLS, functions and business triggers come in later migrations.
create extension if not exists pgtap with schema extensions;

create type public.user_role as enum ('member', 'admin');
create type public.content_status as enum ('draft', 'published');
create type public.enrollment_source as enum ('free', 'purchase');
create type public.progress_status as enum ('unlocked', 'completed');

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'member',
  weekly_goal_minutes int not null default 0
    constraint profiles_weekly_goal_range check (weekly_goal_minutes between 0 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cover_url text,
  is_free boolean not null default true,
  price_thb int constraint courses_price_nonneg check (price_thb is null or price_thb >= 0),
  status public.content_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  source public.enrollment_source not null default 'free',
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  sort_order int not null,
  pass_score int not null default 60
    constraint lessons_pass_score_range check (pass_score between 1 and 100),
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug),
  unique (course_id, sort_order) deferrable initially immediate
);

create table public.lesson_contents (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  content_md text not null default '',
  video_url text
    constraint lesson_contents_video_url_youtube check (
      video_url is null
      or video_url ~ '^https://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[A-Za-z0-9_-]{11}'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  prompt text not null,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, question_id)
);

create table public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  correct_choice_id uuid not null,
  -- explanation lives here (admin-only) so it cannot leak the answer before submission
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the correct choice must belong to the same question
  foreign key (correct_choice_id, question_id)
    references public.quiz_choices (id, question_id) on delete cascade
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status public.progress_status not null default 'unlocked',
  best_score int constraint lesson_progress_best_score_range check (best_score between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  score_pct int not null constraint quiz_attempts_score_range check (score_pct between 0 and 100),
  passed boolean not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_attempt_answers (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  choice_id uuid not null references public.quiz_choices (id) on delete cascade,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  practiced_on date not null,
  minutes int not null constraint practice_logs_minutes_range check (minutes between 1 and 600),
  activity text not null,
  note text constraint practice_logs_note_len check (char_length(note) <= 500),
  lesson_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK indexes not already covered by a PK/unique index
create index on public.enrollments (course_id);
create index on public.quiz_questions (lesson_id, sort_order);
create index on public.quiz_choices (question_id, sort_order);
create index on public.lesson_progress (lesson_id);
create index on public.quiz_attempts (user_id, lesson_id);
create index on public.quiz_attempts (lesson_id);
create index on public.quiz_attempt_answers (question_id);
create index on public.quiz_attempt_answers (choice_id);
create index on public.practice_logs (user_id, practiced_on);
create index on public.practice_logs (lesson_id);

do $$
declare t text;
begin
  foreach t in array array['profiles','courses','enrollments','lessons','lesson_contents',
    'quiz_questions','quiz_choices','quiz_answer_keys','lesson_progress','quiz_attempts',
    'quiz_attempt_answers','practice_logs'] loop
    execute format('create trigger set_updated_at before update on public.%I
      for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Practice page redesign: a free-text topic ("what did you practise today?") and how the session felt.
-- Both are optional so existing logs and older clients keep working.
alter table public.practice_logs
  add column topic text constraint practice_logs_topic_len check (char_length(topic) <= 120),
  add column feeling text constraint practice_logs_feeling_valid
    check (feeling in ('great', 'progress', 'sore', 'tough'));

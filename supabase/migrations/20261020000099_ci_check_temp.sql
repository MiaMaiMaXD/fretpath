-- TEMPORARY: deliberately leaks answer keys to members to prove CI fails (docs/qa/ci.md step 2). Never merge.
create policy ci_check_leak_answer_keys on public.quiz_answer_keys
  for select to authenticated using (true);

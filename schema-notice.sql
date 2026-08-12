-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste all -> Run
-- This is IN ADDITION to your other schema files — don't remove those.

-- Lets the public booking website read ONLY the "schedule-notice" entry from app_state —
-- nothing else in that table (patients, medications, etc.) is exposed by this policy.
create policy "anyone can read the schedule notice"
  on app_state for select
  to anon
  using (key = 'schedule-notice');

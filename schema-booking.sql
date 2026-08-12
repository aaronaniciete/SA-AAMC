-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste all -> Run
-- This is IN ADDITION to the original schema.sql from your first setup — don't remove that one.

-- Holds every online booking submission. The public booking website can only INSERT here
-- (never read names/contact info back) — clinic staff review and approve from inside the EMR.
create table if not exists patient_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  dob date,
  guardian text,
  sex text,
  contact text,
  address text,
  allergies text,
  gcash_reference text not null,
  appointment_date date not null,
  appointment_time text not null,
  slot_number int,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  reviewed_by text,
  reviewed_at timestamptz,
  patient_id text -- filled in once approved and linked to a real EMR patient record
);

alter table patient_registrations enable row level security;

-- The public website can submit a new registration — nothing else. It cannot read this
-- table back (no names, contact numbers, or addresses are ever exposed publicly).
create policy "anyone can submit a registration"
  on patient_registrations for insert
  to anon
  with check (status = 'pending');

-- Clinic staff (signed in to the EMR) can see and manage every registration.
create policy "staff can read registrations"
  on patient_registrations for select
  to authenticated
  using (true);

create policy "staff can update registrations"
  on patient_registrations for update
  to authenticated
  using (true);

-- A narrow public view with ONLY date/time — this is what lets the booking website show
-- "this slot is already taken" without exposing any patient's name or personal details.
create or replace view booked_slots_public as
  select appointment_date, appointment_time
  from patient_registrations
  where status in ('pending', 'approved');

grant select on booked_slots_public to anon;

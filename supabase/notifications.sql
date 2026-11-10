-- Run once in Supabase → SQL Editor. Stores which phones want notifications.
create table if not exists public.push_subs (
  endpoint   text primary key,           -- the phone's push address
  sub        jsonb not null,             -- full subscription (address + keys)
  who        int not null check (who in (0, 1)), -- 0 = first name in Settings, 1 = second name
  created_at timestamptz not null default now()
);

alter table public.push_subs enable row level security;

-- Only logged-in users (the two of you) can add or remove their phones.
drop policy if exists "logged in users manage push subs" on public.push_subs;
create policy "logged in users manage push subs" on public.push_subs
  for all to authenticated using (true) with check (true);

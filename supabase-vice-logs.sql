-- Run this in Supabase Dashboard → SQL Editor
-- Creates the vice_logs table with RLS policies.

create table if not exists public.vice_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  vice_id     text not null,
  vice_label  text not null,
  vice_icon   text not null,
  quantity    integer not null default 1 check (quantity >= 1),
  logged_at   timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.vice_logs enable row level security;

create policy "users can read own logs"
  on public.vice_logs for select
  using (auth.uid() = user_id);

create policy "users can insert own logs"
  on public.vice_logs for insert
  with check (auth.uid() = user_id);

create policy "users can delete own logs"
  on public.vice_logs for delete
  using (auth.uid() = user_id);

-- Index for fast per-user time-range queries
create index if not exists vice_logs_user_id_logged_at_idx
  on public.vice_logs (user_id, logged_at desc);

-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Temporary staging table for large file uploads: the browser slices a file
-- into small pieces (well under Vercel's ~4.5MB serverless request limit) and
-- stashes each one here; once all pieces arrive, the app reassembles and
-- parses the file, then deletes the rows. Nothing here is meant to persist --
-- it's scratch space for a single upload, not a real dataset store.

create table if not exists upload_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  upload_id uuid not null,
  chunk_index integer not null,
  data text not null,
  created_at timestamptz not null default now()
);

create index if not exists upload_chunks_upload_id_idx on upload_chunks (upload_id);

alter table upload_chunks enable row level security;

create policy "Users manage their own upload chunks"
  on upload_chunks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

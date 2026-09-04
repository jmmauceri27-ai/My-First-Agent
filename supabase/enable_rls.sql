-- Fixes the Supabase linter's "RLS Disabled in Public" warnings.
--
-- This app never uses Supabase's client library or an anon key — all
-- access goes through Prisma over DATABASE_URL/DIRECT_URL, connected as
-- the `postgres` role, which bypasses RLS. So turning RLS on here (with
-- no policies) only closes off Supabase's public PostgREST API; it does
-- not affect this app.
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

alter table "public"."Note" enable row level security;
alter table "public"."DraftOrderPick" enable row level security;
alter table "public"."DraftSeason" enable row level security;
alter table "public"."DraftHistoryPick" enable row level security;
alter table "public"."GameLog" enable row level security;
alter table "public"."Player" enable row level security;
alter table "public"."MockDraftPick" enable row level security;
alter table "public"."LeagueSettings" enable row level security;
alter table "public"."MockDraft" enable row level security;

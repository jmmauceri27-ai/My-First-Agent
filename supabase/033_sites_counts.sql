-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Adds a second measurement bag for plain counts (e.g. Palm Trees, Deciduous
-- Tree, Shrubs), separate from `measurements` (sq. ft areas like Turf Area,
-- Sidewalk, Parking Lot) so each displays with the right unit.

alter table sites add column if not exists counts jsonb not null default '{}'::jsonb;

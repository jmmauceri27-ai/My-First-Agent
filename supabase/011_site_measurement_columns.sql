-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Lets you mark specific site columns (Turf Area, Sidewalk, Parking Lot, Bed
-- Space, Public Walk, etc.) as square-footage measurements, so they display
-- with a "sq. ft" suffix in the hover tooltip and the click-to-edit panel.

alter table site_map_bindings
  add column if not exists measurement_columns jsonb not null default '[]';

-- Adds a single typed field for a site's total snowfall (inches) over the most recent winter season.
alter table sites add column if not exists last_season_snowfall numeric;

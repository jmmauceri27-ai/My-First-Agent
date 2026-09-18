-- Renames the rate item tier options from Standard/OT/Premium to Regular/Overtime/Double/Holiday (clearer,
-- payroll-standard terms). rate_tier is plain text with no check constraint, so this updates existing rows to
-- match the new fixed list and moves the column default along with it.

update rate_items set rate_tier = 'Regular' where rate_tier = 'Standard';
update rate_items set rate_tier = 'Overtime' where rate_tier = 'OT';
update rate_items set rate_tier = 'Double/Holiday' where rate_tier = 'Premium';

alter table rate_items alter column rate_tier set default 'Regular';

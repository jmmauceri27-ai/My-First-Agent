-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Remaps crm_opportunities.stage from the old 6-stage pipeline to the new
-- lifecycle-based pipeline: Lead -> Site Walk/Measuring -> RFP Submitted ->
-- Pricing/Negotiation -> Awarded -> Onboarding -> Active Contract -> Renewal,
-- plus a separate "Lost" stage for deals that fall through at any point.
-- Existing opportunities are remapped to their nearest equivalent stage; no
-- rows are deleted.

update crm_opportunities set stage = 'Lead' where stage = 'Prospecting';
update crm_opportunities set stage = 'Site Walk/Measuring' where stage = 'Qualified';
update crm_opportunities set stage = 'RFP Submitted' where stage = 'Proposal Sent';
update crm_opportunities set stage = 'Pricing/Negotiation' where stage = 'Negotiation';
update crm_opportunities set stage = 'Awarded' where stage = 'Closed Won';
update crm_opportunities set stage = 'Lost' where stage = 'Closed Lost';

alter table crm_opportunities alter column stage set default 'Lead';

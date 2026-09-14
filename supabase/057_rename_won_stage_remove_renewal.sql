-- Renames the "Active Agreement" pipeline stage to "Won" and removes "Renewal" as a stage -- any
-- opportunity currently sitting in either one moves to "Won", since Renewal was already a continuation
-- of an active/won agreement.

update crm_opportunities set stage = 'Won' where stage in ('Active Agreement', 'Renewal');

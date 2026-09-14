-- Retroactively marks the opportunities behind two already-existing agreements (Regal and Regal (BGIS)) as
-- Won, identified by their permanent tracking number rather than by name -- both already have a linked
-- agreement (that's why they carry a tracking number at all), so this only changes their stage; it does not
-- create or touch any crm_contracts row.

update crm_opportunities
set stage = 'Won',
    position = (select coalesce(max(position), -1) + 1 from crm_opportunities where stage = 'Won'),
    updated_at = now()
where tracking_number = 'T-0012';

update crm_opportunities
set stage = 'Won',
    position = (select coalesce(max(position), -1) + 1 from crm_opportunities where stage = 'Won'),
    updated_at = now()
where tracking_number = 'T-0028';

-- Renames the "Active Contract" pipeline stage to "Active Agreement" (part of renaming "Contract" to
-- "Agreement" throughout the app). Remaps any existing opportunities sitting in that stage so they keep
-- showing up in the right Kanban column.

update crm_opportunities set stage = 'Active Agreement' where stage = 'Active Contract';

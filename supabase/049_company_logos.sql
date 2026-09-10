-- Lets each client (crm_companies) have a logo. Stored in its own public bucket, separate from the private
-- crm-attachments bucket -- a logo is meant to be displayed inline (list rows, headers), not a sensitive
-- document, so a public bucket avoids generating/refreshing signed URLs just to render an <img>.
alter table crm_companies add column if not exists logo_storage_path text;
alter table crm_companies add column if not exists logo_content_type text;

insert into storage.buckets (id, name, public)
values ('crm-logos', 'crm-logos', true)
on conflict (id) do nothing;

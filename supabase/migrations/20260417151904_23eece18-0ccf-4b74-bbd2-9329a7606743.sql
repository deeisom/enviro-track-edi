CREATE TABLE IF NOT EXISTS public._import_contacts_staging (
  id BIGSERIAL PRIMARY KEY,
  company TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  mobile TEXT NOT NULL DEFAULT '',
  email2 TEXT NOT NULL DEFAULT ''
);
TRUNCATE public._import_contacts_staging;
ALTER TABLE public._import_contacts_staging DISABLE ROW LEVEL SECURITY;
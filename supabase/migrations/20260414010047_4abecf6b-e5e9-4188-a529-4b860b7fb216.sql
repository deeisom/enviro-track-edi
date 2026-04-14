ALTER TABLE public.clients ADD COLUMN phone text NOT NULL DEFAULT '';
ALTER TABLE public.clients ADD COLUMN fax text NOT NULL DEFAULT '';
ALTER TABLE public.clients ADD COLUMN website text NOT NULL DEFAULT '';

ALTER TABLE public.contacts ADD COLUMN mobile_phone text NOT NULL DEFAULT '';
ALTER TABLE public.contacts ADD COLUMN secondary_email text NOT NULL DEFAULT '';
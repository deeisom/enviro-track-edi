
-- Add view_only to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'view_only';

-- Update handle_new_user to assign view_only to all new users (admin still for first user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_count INT;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO _user_count FROM auth.users;
  IF _user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'view_only');
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================
-- 1. ENUM & HELPER FUNCTION
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- 2. PROFILES
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. USER ROLES
-- ============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Authenticated users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. AUTO-CREATE PROFILE + FIRST USER = ADMIN
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_count INT;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO _user_count FROM auth.users;
  IF _user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. CLIENTS
-- ============================================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  industry_type TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. CONTACTS
-- ============================================

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contacts" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 7. PROJECTS
-- ============================================

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  location TEXT NOT NULL DEFAULT '',
  assigned_to TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '1.0',
  parent_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update projects" ON public.projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. PROJECT COUNTER (for EDI-YYYY-NNNN)
-- ============================================

CREATE TABLE public.project_counter (
  year INT PRIMARY KEY,
  counter INT NOT NULL DEFAULT 0
);

ALTER TABLE public.project_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view counter" ON public.project_counter FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert counter" ON public.project_counter FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update counter" ON public.project_counter FOR UPDATE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.get_next_project_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year INT := EXTRACT(YEAR FROM now())::INT;
  _counter INT;
BEGIN
  INSERT INTO public.project_counter (year, counter) VALUES (_year, 1)
  ON CONFLICT (year) DO UPDATE SET counter = project_counter.counter + 1
  RETURNING counter INTO _counter;

  RETURN 'EDI-' || _year || '-' || lpad(_counter::TEXT, 4, '0');
END;
$$;

-- ============================================
-- 9. ACTIVITY LOG
-- ============================================

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  project_number TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  invoice_id TEXT,
  invoice_number TEXT,
  is_invoice_event BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view activity" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- 10. RATES
-- ============================================

CREATE TABLE public.rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'services',
  default_rate NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'per hour'
);

ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view rates" ON public.rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert rates" ON public.rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update rates" ON public.rates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete rates" ON public.rates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default rates
INSERT INTO public.rates (name, description, category, default_rate, unit) VALUES
  ('Program Administration', 'Review & update documentation; data interpretation; DOE/DEP forms preparation; project communications & coordination', 'services', 95, 'per hour'),
  ('Sample Collection', 'Fieldwork - on-site first-draw sample collection; field recordation; sample processing', 'services', 65, 'per hour'),
  ('Lead in Water - EPA 200.8', 'Analysis for lead in water per EPA Method 200.8 (ICP-MS); includes QA/QC blanks; 2-week turnaround', 'analytical', 16, 'per sample'),
  ('Sample Bottles & Supplies', 'Supplies; 250ml sample bottles with preservative; gloves, labels', 'consumables', 4, 'each'),
  ('Psychrometer/TSI-Calc', 'Psychrometer/TSI-Calc for temperature and humidity readings at sample locations', 'equipment', 85, 'per day'),
  ('Project Manager', 'Project Manager', 'services', 78.5, 'per hour'),
  ('Asbestos Air Monitor', 'Asbestos Air Monitor', 'services', 65, 'per hour'),
  ('Final Report', 'Final Report', 'services', 150, 'flat'),
  ('TEM Air Samples 6-Hour TAT', 'TEM air samples 6-hour TAT', 'analytical', 82, 'per sample'),
  ('Industrial Hygiene Services', 'Project oversight; onsite sampling and data collection; sample preparation; lab transmittal; data interpretation; final report preparation; project communications', 'services', 1500, 'flat'),
  ('Mold in Air Samples', 'Mold in air samples', 'analytical', 70, 'per sample'),
  ('Sampling Cassettes for Mold', 'Sampling cassettes for mold in air', 'consumables', 6, 'each'),
  ('Zefon Sampling Pump', 'Zefon sampling pump', 'equipment', 30, 'per day');

-- ============================================
-- 11. INVOICES
-- ============================================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'invoice',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  bill_to JSONB NOT NULL DEFAULT '{"name":"","address":""}',
  po_number TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  project_summary TEXT NOT NULL DEFAULT '',
  line_items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoice counter
CREATE TABLE public.invoice_counter (
  type TEXT PRIMARY KEY,
  counter INT NOT NULL DEFAULT 0
);

ALTER TABLE public.invoice_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view inv counter" ON public.invoice_counter FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert inv counter" ON public.invoice_counter FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update inv counter" ON public.invoice_counter FOR UPDATE TO authenticated USING (true);

INSERT INTO public.invoice_counter (type, counter) VALUES ('invoice', 0), ('estimate', 0);

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefix TEXT;
  _counter INT;
BEGIN
  _prefix := CASE WHEN _type = 'invoice' THEN 'INV' ELSE 'EST' END;

  UPDATE public.invoice_counter SET counter = counter + 1 WHERE type = _type
  RETURNING counter INTO _counter;

  IF _counter IS NULL THEN
    INSERT INTO public.invoice_counter (type, counter) VALUES (_type, 1);
    _counter := 1;
  END IF;

  RETURN _prefix || '-' || lpad(_counter::TEXT, 4, '0');
END;
$$;

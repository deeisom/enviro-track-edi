CREATE OR REPLACE FUNCTION public.can_edit_app_data(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'user'::app_role)
$$;

DROP POLICY IF EXISTS "Authenticated can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated can update clients" ON public.clients;
CREATE POLICY "Editors can insert clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated can update contacts" ON public.contacts;
CREATE POLICY "Editors can insert contacts" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update contacts" ON public.contacts
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated can update projects" ON public.projects;
CREATE POLICY "Editors can insert projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert activity" ON public.activity_log;
CREATE POLICY "Editors can insert activity" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert rates" ON public.rates;
DROP POLICY IF EXISTS "Authenticated can update rates" ON public.rates;
CREATE POLICY "Editors can insert rates" ON public.rates
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update rates" ON public.rates
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated can update invoices" ON public.invoices;
CREATE POLICY "Editors can insert invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update invoices" ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated can update proposals" ON public.proposals;
CREATE POLICY "Editors can insert proposals" ON public.proposals
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update proposals" ON public.proposals
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can update clauses" ON public.proposal_clauses;
DROP POLICY IF EXISTS "Admins can insert clauses" ON public.proposal_clauses;
CREATE POLICY "Editors can insert clauses" ON public.proposal_clauses
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update clauses" ON public.proposal_clauses
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert counter" ON public.project_counter;
DROP POLICY IF EXISTS "Authenticated can update counter" ON public.project_counter;
CREATE POLICY "Editors can insert project counter" ON public.project_counter
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update project counter" ON public.project_counter
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert inv counter" ON public.invoice_counter;
DROP POLICY IF EXISTS "Authenticated can update inv counter" ON public.invoice_counter;
CREATE POLICY "Editors can insert invoice counter" ON public.invoice_counter
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update invoice counter" ON public.invoice_counter
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert proposal counter" ON public.proposal_counter;
DROP POLICY IF EXISTS "Authenticated can update proposal counter" ON public.proposal_counter;
CREATE POLICY "Editors can insert proposal counter" ON public.proposal_counter
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_app_data(auth.uid()));
CREATE POLICY "Editors can update proposal counter" ON public.proposal_counter
  FOR UPDATE TO authenticated
  USING (public.can_edit_app_data(auth.uid()))
  WITH CHECK (public.can_edit_app_data(auth.uid()));

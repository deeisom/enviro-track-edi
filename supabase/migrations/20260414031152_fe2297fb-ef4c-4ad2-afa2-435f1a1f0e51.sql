-- Proposals table
CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  client_id uuid REFERENCES public.clients(id),
  project_id uuid REFERENCES public.projects(id),
  estimate_id uuid REFERENCES public.invoices(id),
  proposal_date text NOT NULL DEFAULT '',
  expiration_date text NOT NULL DEFAULT '',
  service_type text NOT NULL DEFAULT '',
  site_name text NOT NULL DEFAULT '',
  site_address text NOT NULL DEFAULT '',
  building_area text NOT NULL DEFAULT '',
  company_rep_name text NOT NULL DEFAULT '',
  company_rep_title text NOT NULL DEFAULT '',
  client_signer_name text NOT NULL DEFAULT '',
  client_signer_title text NOT NULL DEFAULT '',
  cover_page jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposal_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  background jsonb NOT NULL DEFAULT '{"text":"","ai_generated":false,"locked":false,"prompt_inputs":{}}'::jsonb,
  scope jsonb NOT NULL DEFAULT '{"text":"","ai_generated":false,"locked":false,"prompt_inputs":{}}'::jsonb,
  fee_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  terms_selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  acceptance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT proposals_proposal_number_unique UNIQUE (proposal_number)
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view proposals" ON public.proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert proposals" ON public.proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update proposals" ON public.proposals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete proposals" ON public.proposals FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Proposal clauses library
CREATE TABLE public.proposal_clauses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'foundation',
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  service_types text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view clauses" ON public.proposal_clauses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update clauses" ON public.proposal_clauses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can insert clauses" ON public.proposal_clauses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete clauses" ON public.proposal_clauses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_clauses_updated_at BEFORE UPDATE ON public.proposal_clauses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Proposal counter
CREATE TABLE public.proposal_counter (
  id serial PRIMARY KEY,
  counter integer NOT NULL DEFAULT 0
);

ALTER TABLE public.proposal_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view proposal counter" ON public.proposal_counter FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert proposal counter" ON public.proposal_counter FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update proposal counter" ON public.proposal_counter FOR UPDATE TO authenticated USING (true);

-- Seed counter
INSERT INTO public.proposal_counter (counter) VALUES (0);

-- RPC for next proposal number
CREATE OR REPLACE FUNCTION public.get_next_proposal_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _counter INT;
BEGIN
  UPDATE public.proposal_counter SET counter = counter + 1 WHERE id = 1
  RETURNING counter INTO _counter;

  RETURN 'PROP-' || lpad(_counter::TEXT, 4, '0');
END;
$$;

-- Seed default terms clauses from legacy template
INSERT INTO public.proposal_clauses (title, body, category, is_default, sort_order) VALUES
('Fee Validity', 'The fees quoted will remain in effect for a period of 30 days from the date of this proposal. A signed copy of this proposal must be returned to EDI in order to begin work. Please note that in the event additional testing is required the unit rates in the Fee Schedule and in the Terms and Condition sections of this proposal will apply.', 'foundation', true, 1),
('Not Comprehensive Evaluation', 'EDI is not conducting a comprehensive indoor air quality building evaluation, which could require HVAC engineers, Architects, Microbiologists, Certified Industrial Hygienists, and Mechanical engineers etc. These services are available, if requested by the Client, for additional fees which will require a separate proposal.', 'testing_limitations', true, 2),
('Point-in-Time Testing', 'The Client acknowledges that all testing is conducted at a "point in time" and that as conditions change subsequent sampling and analysis may be warranted. The tests EDI conducts are based on the problem described to us by the Client and site conditions at the time of our evaluation. These tests may not be the only testing methodologies available for this type of evaluation.', 'testing_limitations', true, 3),
('Legal Fees', 'In the event the Client fails to pay invoices when due or otherwise breaches the contract, and EDI is required to engage legal counsel for purposes of enforcing the terms and agreements, the Client is responsible for all legal fees, expenses, and court costs incurred by EDI.', 'legal', true, 4),
('Hazardous Materials Disclaimer', 'It is understood and agreed that the EDI has done nothing to create or contribute to the presence of any hazardous waste, pollutants, chemicals, or other hazardous materials at the facilities covered by this proposal. The Client understands and agrees that a full and complete determination as to whether a certain property is or is not free from environmental issues cannot be made with 100% certainty.', 'foundation', true, 5),
('Scope Limitation & Liability', 'The Client has retained EDI for the sole purpose of assisting the Client with the examination and testing outlined in this proposal. EDI is only responsible for providing the services outlined in this proposal for those facilities tested. The Client agrees that EDI will not be held liable for any disclosures, notifications, or reports that are required to be made to third parties, including the appropriate governmental agencies. EDI will not be responsible for providing security for the Client''s property.', 'foundation', true, 6),
('Arbitration', 'The parties agree that all disputes concerning this project shall be submitted by either party to arbitration under the auspices of the American Arbitration Association in accordance with its rules then in effect. The hearing locale shall be Camden County, New Jersey. Any decision rendered by said association shall be binding upon the parties and may be entered as a judgment in any court of competent jurisdiction.', 'legal', true, 7),
('Additional Services', 'No samples beyond those included in the base price of this proposal will be collected without prior written approval of the Client. This proposal reflects different options and represents an estimate of the work required.', 'billing', true, 8);

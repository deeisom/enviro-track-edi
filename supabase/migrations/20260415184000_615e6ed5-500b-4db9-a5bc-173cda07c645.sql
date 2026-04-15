
-- Clear existing generic clauses
DELETE FROM public.proposal_clauses;

-- ========== PRICING & AUTHORIZATION ==========
INSERT INTO public.proposal_clauses (title, body, category, is_default, sort_order, service_types) VALUES

('Fee Validity Period',
'The fees quoted in this proposal are valid for a period of [feeValidityPeriod] from the date of this proposal. After this period, the fees are subject to review and adjustment.',
'pricing_authorization', true, 10, '{}'),

('Signed Authorization Required',
'Work will not commence until EDI has received a signed copy of this proposal or written authorization (including email) from an authorized representative of the Client.',
'pricing_authorization', true, 11, '{}'),

('Purchase Order Requirement',
'If the Client requires a Purchase Order (PO) for payment processing, the PO must be issued prior to the commencement of work. Any delays caused by the absence of a PO are the responsibility of the Client.',
'pricing_authorization', false, 12, '{inspection,testing,consulting}'),

('Payment Terms',
'Payment is due [paymentTiming]. Invoices not paid within 30 days of the invoice date shall be subject to a late payment charge of 1.5% per month (18% per annum) on the outstanding balance.',
'pricing_authorization', true, 13, '{}'),

('Credit Card Surcharge',
'A surcharge of 3% will be applied to all payments made by credit card to cover processing fees.',
'pricing_authorization', false, 14, '{}'),

('Regulatory-Change Pricing',
'If regulatory changes occur after the date of this proposal that affect the scope or cost of services, EDI reserves the right to adjust fees accordingly after written notification to the Client.',
'pricing_authorization', false, 15, '{consulting,disposal}'),

('Additional Services / Retesting',
'Any additional services, retesting, or work not specifically included in this proposal will be performed only upon written authorization from the Client and will be billed at EDI''s standard rates or as mutually agreed upon in writing.',
'pricing_authorization', true, 16, '{}'),

-- ========== BILLING ==========
('Working Hours',
'Standard working hours are Monday through Friday, 7:00 AM to 5:00 PM. Work performed outside of these hours may be subject to additional charges as outlined in this proposal.',
'billing', false, 20, '{inspection,testing,air_quality}'),

('Portal-to-Portal Billing',
'All field personnel time will be billed on a portal-to-portal basis, which includes travel time from the point of origin to the project site and return.',
'billing', false, 21, '{inspection,testing,air_quality,disposal}'),

('Minimum Hours / Overtime / Weekend / Holiday Rates',
'A minimum of [minHours] hours will be charged for each site visit. Overtime rates of [overtimeRate] times the standard rate apply for work performed beyond 8 hours per day or 40 hours per week. Weekend rates are [weekendRate] times the standard rate. Holiday rates are [holidayRate] times the standard rate.',
'billing', false, 22, '{inspection,testing,air_quality}'),

('Project Management Out-of-Scope Rate',
'Project management services beyond those included in the scope of this proposal will be billed at a rate of $[pmRate] per hour.',
'billing', false, 23, '{consulting,inspection}'),

('Contractor Delay Charges',
'In the event that EDI personnel are delayed at the project site due to circumstances beyond EDI''s control (e.g., contractor not ready, site access issues), standby time will be billed at the applicable hourly rate.',
'billing', false, 24, '{inspection,testing}'),

-- ========== TESTING LIMITATIONS ==========
('Point-in-Time Testing',
'All testing and sampling results represent conditions only at the specific locations and times at which they were conducted. Results should not be interpreted as representative of conditions at other locations or times.',
'testing_limitations', false, 30, '{testing,air_quality,inspection}'),

('Not a Comprehensive Evaluation',
'This assessment does not constitute a comprehensive evaluation of all environmental conditions at the site. The scope is limited to the specific services described in this proposal.',
'testing_limitations', false, 31, '{testing,air_quality,inspection,consulting}'),

('Method-Specific Limitations',
'Testing and analysis will be performed in accordance with [methodDetails]. The results are subject to the inherent limitations of these methods, including detection limits and potential interferences.',
'testing_limitations', false, 32, '{testing,air_quality}'),

('Sampling Damage Disclaimer',
'Invasive sampling procedures (e.g., bulk sampling, core sampling) may cause minor cosmetic damage to building materials. EDI will make reasonable efforts to minimize such damage but is not responsible for restoration or repair of sampled areas.',
'testing_limitations', false, 33, '{testing,inspection}'),

-- ========== SCOPE & LIABILITY ==========
('Scope Limitation',
'The scope of services is limited to those specifically described in this proposal. Any additional work requested by the Client or required by regulatory agencies will be addressed through a separate proposal or change order.',
'scope_liability', true, 40, '{}'),

('No Environmental Certainty',
'Environmental consulting and testing services involve professional judgments based on limited data. EDI cannot guarantee that environmental conditions at the site are free from contamination or other environmental concerns beyond the scope of this assessment.',
'scope_liability', true, 41, '{}'),

('Consultant Did Not Create Hazard',
'The Client acknowledges that EDI did not create any environmental hazard or condition that may be discovered during the course of this project. EDI''s role is limited to identification, assessment, and/or remediation advisory services as described herein.',
'scope_liability', true, 42, '{}'),

('Third-Party Reporting Exclusion',
'This report and its findings are prepared solely for the use of the Client and may not be relied upon by any third party without the express written consent of EDI. EDI assumes no liability to third parties.',
'scope_liability', true, 43, '{}'),

('Security Disclaimer',
'EDI shall not be responsible for providing security for the Client''s property during or after the performance of services. The Client is responsible for securing the site and its contents.',
'scope_liability', true, 44, '{}'),

-- ========== CLIENT RESPONSIBILITIES ==========
('Hazardous Substance Notification',
'The Client shall notify EDI of any known or suspected hazardous substances, environmental conditions, or underground utilities at or near the project site prior to the commencement of work.',
'client_responsibilities', false, 50, '{inspection,testing,disposal,air_quality}'),

('Drawings and Site Information',
'The Client shall provide EDI with available drawings, plans, specifications, and other relevant site information to facilitate the performance of services. EDI is not responsible for the accuracy of information provided by the Client.',
'client_responsibilities', false, 51, '{inspection,consulting}'),

('Unauthorized Persons',
'The Client shall ensure that unauthorized persons are excluded from the work area during the performance of EDI''s services. EDI is not responsible for the safety of unauthorized individuals who enter the work area.',
'client_responsibilities', false, 52, '{testing,inspection,air_quality,disposal}'),

-- ========== DISPOSAL ==========
('Disposal Assumptions',
'Cost estimates for waste disposal are based on the assumption that materials will be classified as [wasteClassification]. If actual waste characterization results indicate a different classification, disposal costs will be adjusted accordingly.',
'disposal', false, 60, '{disposal}'),

('Generator Report / Manifest',
'EDI will prepare waste manifests and generator reports as required by applicable regulations. The Client, as the waste generator, retains ultimate responsibility for the proper disposal of all waste materials.',
'disposal', false, 61, '{disposal}'),

('Generator''s Agent Authorization',
'The Client hereby authorizes EDI to act as the Client''s agent for the purpose of arranging waste transportation and disposal. The Client acknowledges that it remains the generator of record and bears all generator liabilities.',
'disposal', false, 62, '{disposal}'),

('Disposal Indemnity',
'The Client agrees to indemnify and hold harmless EDI from any and all claims, damages, losses, and expenses arising from the disposal of waste materials generated at the project site, except to the extent caused by EDI''s sole negligence.',
'disposal', false, 63, '{disposal}'),

-- ========== LEGAL ==========
('Legal Fees / Collections',
'In the event that EDI is required to engage legal counsel to collect unpaid fees, the Client agrees to pay all reasonable attorney''s fees, court costs, and collection expenses incurred by EDI.',
'legal', false, 70, '{}'),

('Arbitration',
'The parties agree that all disputes concerning this project shall be submitted by either party to arbitration under the auspices of the American Arbitration Association in accordance with its rules then in effect. The hearing locale shall be Camden County, New Jersey. Any decision rendered by the said association shall be binding upon the parties and may be entered as a judgment in any court of competent jurisdiction.',
'legal', true, 71, '{}');

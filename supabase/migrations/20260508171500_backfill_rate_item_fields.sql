ALTER TABLE public.rates ADD COLUMN IF NOT EXISTS item TEXT NOT NULL DEFAULT '';
ALTER TABLE public.rates ADD COLUMN IF NOT EXISTS item_description TEXT NOT NULL DEFAULT '';

WITH desired_rates (name, item, item_description, category, default_rate, unit) AS (
  VALUES
    ('Asbestos Air Monitor', 'Asbestos Air Monitor', 'Asbestos Air Monitor', 'services', 65, 'per hour'),
    ('Final Report', 'Final Report', 'Final Report', 'services', 150, 'flat'),
    ('Industrial Hygiene Services', 'Industrial Hygiene Services', 'Project oversight; onsite sampling and data collection; sample preparation; lab transmittal; data interpretation; final report preparation; project communications', 'services', 1500, 'flat'),
    ('Lead in Water - EPA 200.8', 'Analytical', 'Analysis for lead in water per EPA Method 200.8 (ICP-MS); includes QA/QC blanks; 2-week turnaround', 'analytical', 16, 'per sample'),
    ('Mold in Air Samples', 'Analytical', 'Mold in air samples', 'analytical', 70, 'per sample'),
    ('Program Administration', 'Program Administration', 'Review & update documentation; data interpretation; DOE/DEP forms preparation; project communications & coordination', 'services', 95, 'per hour'),
    ('Project Manager', 'Project Manager', 'Project Manager', 'services', 78.5, 'per hour'),
    ('Psychrometer/TSI-Calc', 'Equipment', 'Psychrometer/TSI-Calc for temperature and humidity readings at sample locations.', 'equipment', 85, 'per day'),
    ('Sample Bottles & Supplies', 'Consumables', 'Supplies; 250Ml sample bottles with preservative; gloves, labels', 'consumables', 4, 'each'),
    ('Sample Collection', 'Sample Collection', 'Fieldwork - on-site first-draw sample collection; field recordation; sample processing', 'services', 65, 'per hour'),
    ('Sampling Cassettes for Mold', 'Analytical', 'Sampling cassettes for mold in air', 'consumables', 6, 'each'),
    ('TEM Air Samples 6-Hour TAT', 'Lab Fees', 'TEM air samples 6-hour TAT', 'analytical', 82, 'per sample'),
    ('Zefon Sampling Pump', 'Equipment', 'Zefon sampling pump', 'equipment', 30, 'per day')
)
UPDATE public.rates AS rates
SET
  item = desired_rates.item,
  item_description = desired_rates.item_description,
  description = desired_rates.item_description,
  category = desired_rates.category,
  default_rate = desired_rates.default_rate,
  unit = desired_rates.unit
FROM desired_rates
WHERE rates.name = desired_rates.name;

WITH desired_rates (name, item, item_description, category, default_rate, unit) AS (
  VALUES
    ('Asbestos Air Monitor', 'Asbestos Air Monitor', 'Asbestos Air Monitor', 'services', 65, 'per hour'),
    ('Final Report', 'Final Report', 'Final Report', 'services', 150, 'flat'),
    ('Industrial Hygiene Services', 'Industrial Hygiene Services', 'Project oversight; onsite sampling and data collection; sample preparation; lab transmittal; data interpretation; final report preparation; project communications', 'services', 1500, 'flat'),
    ('Lead in Water - EPA 200.8', 'Analytical', 'Analysis for lead in water per EPA Method 200.8 (ICP-MS); includes QA/QC blanks; 2-week turnaround', 'analytical', 16, 'per sample'),
    ('Mold in Air Samples', 'Analytical', 'Mold in air samples', 'analytical', 70, 'per sample'),
    ('Program Administration', 'Program Administration', 'Review & update documentation; data interpretation; DOE/DEP forms preparation; project communications & coordination', 'services', 95, 'per hour'),
    ('Project Manager', 'Project Manager', 'Project Manager', 'services', 78.5, 'per hour'),
    ('Psychrometer/TSI-Calc', 'Equipment', 'Psychrometer/TSI-Calc for temperature and humidity readings at sample locations.', 'equipment', 85, 'per day'),
    ('Sample Bottles & Supplies', 'Consumables', 'Supplies; 250Ml sample bottles with preservative; gloves, labels', 'consumables', 4, 'each'),
    ('Sample Collection', 'Sample Collection', 'Fieldwork - on-site first-draw sample collection; field recordation; sample processing', 'services', 65, 'per hour'),
    ('Sampling Cassettes for Mold', 'Analytical', 'Sampling cassettes for mold in air', 'consumables', 6, 'each'),
    ('TEM Air Samples 6-Hour TAT', 'Lab Fees', 'TEM air samples 6-hour TAT', 'analytical', 82, 'per sample'),
    ('Zefon Sampling Pump', 'Equipment', 'Zefon sampling pump', 'equipment', 30, 'per day')
)
INSERT INTO public.rates (name, description, item, item_description, category, default_rate, unit)
SELECT name, item_description, item, item_description, category, default_rate, unit
FROM desired_rates
WHERE NOT EXISTS (
  SELECT 1
  FROM public.rates
  WHERE public.rates.name = desired_rates.name
);

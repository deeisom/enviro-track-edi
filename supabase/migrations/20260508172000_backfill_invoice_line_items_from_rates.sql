WITH rebuilt_invoices AS (
  SELECT
    invoices.id,
    jsonb_agg(
      CASE
        WHEN jsonb_typeof(line_item.value) = 'object' AND rates.id IS NOT NULL THEN
          line_item.value
          || CASE
            WHEN coalesce(line_item.value ->> 'name', '') = '' THEN
              jsonb_build_object('name', coalesce(nullif(rates.item, ''), rates.name, ''))
            ELSE '{}'::jsonb
          END
          || CASE
            WHEN coalesce(line_item.value ->> 'description', '') = '' THEN
              jsonb_build_object('description', coalesce(nullif(rates.item_description, ''), nullif(rates.description, ''), nullif(rates.item, ''), rates.name, ''))
            ELSE '{}'::jsonb
          END
        ELSE line_item.value
      END
      ORDER BY line_item.ordinality
    ) AS line_items
  FROM public.invoices AS invoices
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(invoices.line_items) = 'array' THEN invoices.line_items
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS line_item(value, ordinality)
  LEFT JOIN public.rates AS rates
    ON rates.id::text = coalesce(line_item.value ->> 'rateItemId', line_item.value ->> 'rate_item_id')
  GROUP BY invoices.id
)
UPDATE public.invoices AS invoices
SET line_items = rebuilt_invoices.line_items
FROM rebuilt_invoices
WHERE invoices.id = rebuilt_invoices.id
  AND invoices.line_items IS DISTINCT FROM rebuilt_invoices.line_items;

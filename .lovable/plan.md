

## Plan: Add Name / Item / Item Description to Rate Table

### Summary

Currently, rate items have a single `name` and `description`. You want three distinct fields:

- **Name** — internal label shown in the "Add from rate table" dropdown when building invoices
- **Item** — the item title that appears on the actual invoice/estimate
- **Item Description** — the detailed description that appears on the invoice/estimate

### Database Changes

Add two new columns to the `rates` table:

```text
item TEXT NOT NULL DEFAULT ''
item_description TEXT NOT NULL DEFAULT ''
```

The existing `name` column stays as the dropdown label. The existing `description` column will be replaced by `item` and `item_description`.

Then update existing rate data with the annotations from your spreadsheet:

| Name | Item | Item Description |
|------|------|-----------------|
| Program Administration | Program Administration | Review & update documentation; data interpretation; DOE/DEP forms preparation; project communications & coordination |
| Fieldwork Sample Collection | Sample Collection | Fieldwork - on-site first-draw sample collection; field recordation; sample processing |
| Analysis for lead in water | Analytical | Analysis for lead in water per EPA Method 200.8 (ICP-MS); includes QA/QC blanks; 2-week turnaround |
| 250 ML sample bottles/Supplies | Consumables | Supplies; 250Ml sample bottles with preservative; gloves, labels |
| Psychrometer/TSI-Calc | Equipment | Psychrometer/TSI-Calc for temperature and humidity readings at sample locations. |
| Project Manager | Project Manager | Project Manager |
| Asbestos Air Monitor | Asbestos Air Monitor | Asbestos Air Monitor |
| Final Report | Final Report | Final Report |
| TEM air samples 6-hour TAT | Lab Fees | TEM air samples 6-hour TAT |
| Industrial Hygiene Services | Industrial Hygiene Services | Project oversight; onsite sampling and data collection; sample preparation; lab transmittal; data interpretation; final report preparation; project communications |
| Mold in air samples | Analytical | Mold in air samples |
| Sampling cassettes for mold in air | Analytical | Sampling cassettes for mold in air |
| Zefon sampling pump | Equipment | Zefon sampling pump |

### Code Changes

1. **`src/types/invoice.ts`** — Add `item` and `itemDescription` fields to `RateItem`. Remove `description` (or keep as alias). The `InvoiceLineItem` already has `name` and `description` which will now be populated from `item` and `item_description`.

2. **`src/services/invoiceStorage.ts`** — Update `mapRate`, `createRate`, `updateRate` to handle the new `item` and `item_description` columns instead of `description`.

3. **`src/pages/RatesPage.tsx`** — Update the form and table to show three fields: Name, Item, Item Description. The table columns change from Name/Category/Rate/Unit to Name/Item/Item Description/Category/Rate/Unit.

4. **`src/pages/InvoicesPage.tsx`** — When adding a line item from the rate table:
   - The dropdown still shows `rate.name` (the friendly label)
   - The invoice line item's `name` gets populated from `rate.item`
   - The invoice line item's `description` gets populated from `rate.itemDescription`

5. **Update existing data** — Use the insert tool to update existing rates with the item/itemDescription values from your spreadsheet.

### Technical Details

- Migration: `ALTER TABLE rates ADD COLUMN item TEXT NOT NULL DEFAULT ''; ALTER TABLE rates ADD COLUMN item_description TEXT NOT NULL DEFAULT '';`
- After migration, update existing rows matching by `name` to set `item` and `item_description` per the spreadsheet
- The `description` column can be dropped or left unused; dropping is cleaner


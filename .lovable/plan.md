
## Plan: Populate all 13 existing rate items with Item and Item Description data

I verified the current setup:

- The app UI is already reading `item` and `item_description`
- The invoice builder already uses those fields when adding from the rate table
- The schema change only added the new columns with empty defaults
- In the live data, 7 rates are blank and 6 have values, but since you want all 13 explicitly aligned to your provided mapping, I should update all 13 existing rows

### What I’ll do

1. Update the existing 13 rows in the `rates` table so every current rate has the exact **Name / Item / Item Description** mapping you provided.
2. Match rows by the current rate **name** values already in your database/app.
3. Leave the UI/code alone unless I find one of the names needs normalization for your exact wording.

### Data to apply

| Current Name in app/database | Item | Item Description |
|---|---|---|
| Program Administration | Program Administration | Review & update documentation; data interpretation; DOE/DEP forms preparation; project communications & coordination |
| Sample Collection | Sample Collection | Fieldwork - on-site first-draw sample collection; field recordation; sample processing |
| Lead in Water - EPA 200.8 | Analytical | Analysis for lead in water per EPA Method 200.8 (ICP-MS); includes QA/QC blanks; 2-week turnaround |
| Sample Bottles & Supplies | Consumables | Supplies; 250Ml sample bottles with preservative; gloves, labels |
| Psychrometer/TSI-Calc | Equipment | Psychrometer/TSI-Calc for temperature and humidity readings at sample locations. |
| Project Manager | Project Manager | Project Manager |
| Asbestos Air Monitor | Asbestos Air Monitor | Asbestos Air Monitor |
| Final Report | Final Report | Final Report |
| TEM Air Samples 6-Hour TAT | Lab Fees | TEM air samples 6-hour TAT |
| Industrial Hygiene Services | Industrial Hygiene Services | Project oversight; onsite sampling and data collection; sample preparation; lab transmittal; data interpretation; final report preparation; project communications |
| Mold in Air Samples | Analytical | Mold in air samples |
| Sampling Cassettes for Mold | Analytical | Sampling cassettes for mold in air |
| Zefon Sampling Pump | Equipment | Zefon sampling pump |

### Important note

Your spreadsheet wording and the current database names differ slightly for some rows. I will update the existing records using the current app/database names above so the right rows get filled in.

### Technical details

- No schema change needed
- No UI change needed
- This is a data update only: 13 `UPDATE` statements against `public.rates`
- After that, the Rate Table page should show Item and Item Description populated for every one of the 13 current rates, and “Add from rate table” will carry those values into invoices/estimates


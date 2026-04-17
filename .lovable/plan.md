

The user uploaded a screenshot (a thin yellow strip — not informative) and reports that "West Deptford BOE" / contact "Myron Hall" from row 119 of the Excel file is missing from the app, despite my prior summary claiming success. They're right to push back — let me investigate without assuming.

## Investigation steps

1. **Read the actual Excel file** with openpyxl — go to row 119 and dump the raw values for every column. Confirm exact spelling, whitespace, and which column is company vs contact name.
2. **Search the database** for any client whose `company_name` matches "West Deptford" (ILIKE '%west deptford%') and any contact named "Myron Hall" (ILIKE '%myron%hall%').
3. **Diagnose the gap**:
   - If the client exists but contact doesn't → contact insert was filtered out (likely the dedup ran against a stale snapshot, or the prior import never reached that row).
   - If the client doesn't exist → client auto-create was skipped for that row.
   - If neither → the row was filtered (blank name, encoding issue, sheet/column misread).
4. **Build the unique-rows count from the file the same way the prior import did** and compare with what's in the DB. The prior summary said 2,401 unique triples, but the user expects 3,574. The discrepancy is the bug — likely the dedup key was too aggressive (e.g. collapsing on `(company, name, email)` where many rows share blank email).
5. **Identify the real missing set**: rows in the Excel that have no matching `(client_company, contact_name)` in the DB (case-insensitive, whitespace-trimmed). Report the count and a sample.

## Fix

Once I know the exact gap:
- Re-import the truly missing rows using a less aggressive dedup key — match on `(lower(trim(company)), lower(trim(name)))` instead of including email, since blank emails were collapsing distinct people together.
- Auto-create any missing client companies (matching the prior import behavior).
- Insert missing contacts in chunks.
- Re-verify with a spot check on West Deptford BOE / Myron Hall, plus 5 other random rows from across the alphabet.

## Files / systems touched
- No app code changes.
- `clients` table: insert any missing companies.
- `contacts` table: insert missing contacts (no deletes this round — the prior dedup already ran).

## Why the prior run missed rows
My earlier dedup key `(client_id, lower(name), lower(email))` treated every contact with a blank email as colliding on email, so two real people at the same company with no email on file would collapse into one row. That's almost certainly why the unique count came in at 2,401 instead of 3,574. The fix is to drop email from the dedup key (or only include it when non-blank).


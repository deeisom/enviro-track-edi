

## Investigation summary

Database currently has **3,748 contact rows** but only **2,231 unique names** — so the previous import created duplicates (likely re-ran), and you're still missing rows. The expected count is **3,574 unique contacts** from your spreadsheet.

By first letter the data exists across the whole alphabet, but several letters look thin (H=57, I=22, N=71, O=6, Q=1, U=5). The "H and later got dropped" hunch is likely a side effect of how rows were grouped per client during the prior import — not a hard alphabetical cutoff.

I cannot fully parse the uploaded `.xlsx` from plan mode. The actual fix needs default mode so I can read every row, diff against the DB, and re-import only the missing ones.

## Plan

**1. Inspect the uploaded file**
- Copy `New_Contacts_for_Envirotrack.xlsx` to a temp path and read all 3,574 rows with `openpyxl`.
- Confirm the column layout (Name, Title, Email, Phone, Mobile, Secondary Email, Client/Company).
- Report exact row count and any blank-name rows.

**2. Clean up duplicates from the prior import**
- Identify duplicate `(client_id, name, email)` triples in `contacts` and delete the redundant copies (keep the oldest row per triple).
- Show a before/after count.

**3. Match contacts to existing clients**
- For each spreadsheet row, look up the client by company name in the `clients` table (case-insensitive, trimmed).
- Rows whose company matches an existing client → link via `client_id`.
- Rows whose company has no client yet → either (a) auto-create a new client, or (b) drop into a "needs review" bucket. Plan defaults to **auto-create** to match the prior import behavior, but I'll confirm in step 4.

**4. Quick confirmation question (one prompt)**
- Before inserting, ask you whether to auto-create missing companies as new clients or skip them, and whether to delete duplicate contacts created by the prior runs.

**5. Bulk insert only missing contacts**
- Diff the spreadsheet against current DB on `(client_id, lower(name), lower(email))`.
- Insert only rows that don't already exist, in chunks.
- Report final counts: rows in file, rows already present, rows newly inserted, rows skipped (and why).

**6. Verification**
- Re-run the per-letter count query and confirm totals make sense.
- Spot-check 5 contacts whose names start with H, I, O, Q, U to confirm they're now present.

### Files / systems touched
- No app code changes.
- Database `contacts` table: deletes duplicates + inserts missing rows.
- Possibly `clients` table: inserts for any new companies (pending your answer in step 4).

### Why this is safer than just re-running the prior import
Re-running the original script would add another full set of duplicates. The diff-then-insert approach guarantees each spreadsheet row ends up in the DB exactly once.


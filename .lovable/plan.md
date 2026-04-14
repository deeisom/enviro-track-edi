

## Plan: Import Excel Client & Contact Data

### Overview
Run a one-time import script that reads the uploaded Excel file and inserts rows into the `clients` and `contacts` tables.

### Column Mapping

**Client fields** (from Excel → DB):
- `Company Name` → `company_name`
- `Business Street` + `Business City` + `Business State` + `Business Postal Code` + `Business Country/Region` → concatenated into `address`
- `Business Phone` → `phone`
- `Business Fax` → `fax`
- `Business Web Site` → `website`
- `Notes` → `notes`

**Contact fields** (from Excel → DB):
- `Contacts` → `name`
- `Phone` → `phone`
- `Mobile Phone` → `mobile_phone`
- `E-mail Address` → `email`
- `Secondary E-mail Address` → `secondary_email`
- `title` → empty string (not in Excel)
- `client_id` → linked to the client created from the same row

### Implementation
1. Copy the Excel file to `/tmp/`
2. Write a Python script using `openpyxl` to read each row
3. For each row, use `psql` to insert a client record, get its UUID, then insert the contact linked to that client
4. Handle deduplication: if a company name already exists, reuse the existing client ID
5. Skip rows with empty company names

### No code changes needed
This is a one-time data import via script — no application code is modified.


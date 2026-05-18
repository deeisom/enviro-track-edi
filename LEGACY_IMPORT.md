# Legacy Contact And Project Import

Use this for a one-time import from the old system after exporting the old data as CSV, TSV, XLSX, or XLS.

## Files

The importer accepts separate files for clients, contacts, and projects. You can provide one, two, or all three. On Windows, old `.xls` files are converted through Excel automatically during the import preview.

Expected columns can use common names. These are the clearest headers:

- Clients: `Company Name`, `Address`, `Industry Type`, `Notes`, `Phone`, `Fax`, `Website`
- Contacts: `Company`, `Contact Name`, `Title`, `Email`, `Phone`, `Mobile Phone`, `Secondary Email`
- Projects: `Project Number`, `Project Name`, `Description`, `Company`, `Location`, `Status`, `Assigned To`, `Notes`

Project numbers are imported exactly as written. Project status can be a status code such as `1.0` or a label such as `Proposal Phase`.

## Setup

Add this local-only value before running the importer:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

Do not put the service role key in Vercel or browser-facing environment variables.

## Preview First

Dry-run is the default and does not change the database:

```powershell
node scripts/import-legacy-data.mjs --clients "C:\path\clients.csv" --contacts "C:\path\contacts.xlsx" --projects "C:\path\projects.csv"
```

The script writes a Markdown and JSON report under `import-reports/`. Review that report for:

- New clients, contacts, and projects to create
- Existing records that will be skipped
- Duplicate project numbers
- Ambiguous company matches
- Projects that will import without a client link

## Apply

After the preview report looks right, run the same command with `--apply`:

```powershell
node scripts/import-legacy-data.mjs --clients "C:\path\clients.csv" --contacts "C:\path\contacts.xlsx" --projects "C:\path\projects.csv" --apply
```

After importing, spot-check the Clients and Projects pages. New projects created after the import should continue from the highest imported `EDI-YYYY-NNNN` project number for the current year.

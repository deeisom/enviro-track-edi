

# Estimates & Invoices Feature

## Template Analysis

Your Excel invoice has this structure:
- **Header**: Company info (Environmental Design Inc., address, phone, website)
- **Bill To**: Client name and address
- **Metadata**: PO #, Date, Invoice #, EDI Project #, Terms (Net 30), Due Date
- **Project Summary**: Description of work
- **Line Items Table**: ITEM | ITEM DESCRIPTION | QTY | RATE | AMOUNT (with formula: QTY x RATE)
- **Total**: Sum of all line item amounts
- **Footer**: Company tagline

Item categories from your example: Program Administration, Sample Collection, Analytical, Consumables, Equipment.

## What Gets Built

### 1. Rate Table Manager (new page: `/rates`)
An editable table where your team manages reusable line items organized by category:
- **Categories**: Services (hourly), Equipment (daily/per-use), Analytical/Lab, Consumables, Other
- **Each item**: Name, description, default rate, unit (per hour / per day / per sample / flat), category
- Examples from your invoice: "Program Administration - $95/hr", "Sample Collection - $65/hr", "Lead Analysis EPA 200.8 - $16/sample"
- Add, edit, delete items anytime; stored in localStorage like everything else

### 2. Estimate/Invoice Creator (new page: `/invoices`)
- **List view**: All estimates and invoices with status, client, total, date
- **Create new**: Opens a form that:
  - Lets you pick a project (auto-fills client, project number, description)
  - Or create standalone (manually enter client info)
  - Set document type: "Estimate" or "Invoice" (same format, different label)
  - Set PO #, terms (default "Net 30"), date, due date
  - Auto-generates sequential invoice number (INV-0001, EST-0001)
  - Add line items by picking from your rate table (pre-fills description and rate) or typing custom ones
  - Adjust QTY and RATE per line; AMOUNT auto-calculates
  - Running total displayed

### 3. Excel Export
Populates your exact `.xltx` template:
- Fills the header cells (Bill To, PO #, Date, Invoice #, Project #, Terms, Due Date)
- Fills the project summary
- Fills each line item row (ITEM, DESCRIPTION, QTY, RATE, AMOUNT)
- Preserves your template's formatting, formulas, and layout
- Downloads as `.xlsx`

### 4. PDF Export
Generates a PDF matching the same layout for emailing — company header, bill-to block, line items table, total, and footer.

## Data Model Additions

```text
RateItem {
  id, name, description, category, defaultRate, unit
}

Invoice {
  id, invoiceNumber, type ("estimate" | "invoice"),
  projectId (optional), clientId,
  billTo { name, address },
  poNumber, date, dueDate, terms,
  projectSummary,
  lineItems: [{ rateItemId?, name, description, qty, rate, amount }],
  total, status ("draft" | "sent" | "paid"),
  createdAt, updatedAt
}
```

## Navigation
- Add "Rate Table" and "Invoices" links to the sidebar
- Add "Create Invoice" button on the Project Detail page for quick access

## Technical Approach
- All new data stored in localStorage via the existing `storage.ts` service pattern
- Excel export uses `openpyxl` (Python script) or `exceljs` (browser-side JS library) to populate your template — since this is a client-side app, we'll use **ExcelJS** in the browser to read your `.xltx` template bundled as a public asset and fill it with data
- PDF export uses a React-rendered print layout converted to PDF via browser print or a library like `jspdf`
- Your uploaded template will be stored in `public/` so the app can fetch and populate it at runtime


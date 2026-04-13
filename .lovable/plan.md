

## Plan: Continuation Page Invoices with Sequential Numbering

### Overview
Three changes: better export error messaging, a line-item count warning, and a "Continuation Page" feature where continuation invoices inherit the parent's invoice number with a `-01`, `-02` suffix.

### 1. Improved export error message (`src/services/invoiceExport.ts`)
- Wrap `exportInvoiceToExcel` body in try/catch
- If error contains "merge", show: "This invoice has too many line items for a single page. Please create a continuation page to split the remaining items."
- Re-throw with this user-friendly message

### 2. Line item count warning (`src/pages/InvoicesPage.tsx`)
- Below the "Line Items" heading, when `lineItems.length >= 8`, show a yellow Alert: "This invoice may exceed a single page. Consider creating a continuation page for additional items."

### 3. Continuation Page feature (`src/pages/InvoicesPage.tsx`)

**New state variables in InvoiceEditor:**
- `isContinuation` (boolean)
- `parentInvoiceId` (string)
- `allInvoices` (Invoice[]) — loaded on mount alongside projects/clients/rates

**UI — new row in the first Card (below Document Type/Project/Status):**
- Checkbox: "This is a continuation page"
- When checked, show a Select dropdown listing invoices of the same `type`, displaying their invoice number and bill-to name
- When a parent is selected, auto-fill: billToName, billToAddress, poNumber, date, terms, dueDate, projectSummary, projectId from the parent

**Invoice number generation:**
- When `isContinuation` is true and a parent is selected, skip calling `getNextInvoiceNumber`
- Instead, query existing invoices to count how many continuation pages already exist for that parent (invoices whose `invoice_number` starts with the parent's number followed by `-`)
- Generate number as: `{parentInvoiceNumber}-{String(count + 1).padStart(2, '0')}`
- Example: parent is `INV-0004`, first continuation is `INV-0004-01`, second is `INV-0004-02`

**Changes to `handleSave` in InvoiceEditor:**
- If `isContinuation && parentInvoiceId`, compute the continuation number client-side before calling `createInvoice`
- Pass the computed invoice number directly — requires a small addition to `createInvoice` in `invoiceStorage.ts` to accept an optional `invoiceNumber` override

**Changes to `src/services/invoiceStorage.ts`:**
- Modify `createInvoice` to accept an optional `invoiceNumber` parameter
- If provided, use it instead of calling `getNextInvoiceNumber`

### Files modified
- `src/pages/InvoicesPage.tsx` — continuation UI, warning, state
- `src/services/invoiceStorage.ts` — optional invoice number override in `createInvoice`
- `src/services/invoiceExport.ts` — better error message

### No database changes needed
The continuation relationship is tracked by the invoice number convention. No new columns or tables required.


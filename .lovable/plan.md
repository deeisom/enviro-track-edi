
The user wants a way to combine a parent invoice with all of its child continuation invoices into a single multi-page Excel export. The "Continuation Invoices" feature already exists — invoices have a `parentInvoiceId` field linking children to a parent, and there's a manual workflow for handling 8+ line items across multiple invoices.

Let me confirm what exists by checking the relevant files.
<lov-tool-use id="toolu_vrtx_01CU1PxSnXdK36xiCtiUPwLc" name="code--view" integration-id="code" data="{\"file_path\": \"src/services/invoiceExport.ts\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_018auGZx5aswq3XsLeDxdETV" name="code--search_files" integration-id="code" data="{\"query\": \"parentInvoiceId|parent_invoice_id\", \"include_patterns\": \"src/**/*.tsx,src/**/*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_017Q1asmnX8tzNdRqZHUo1jK" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/InvoicesPage.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01QwSFd7T4T6Qi4wqh3zdjfe" name="code--view" integration-id="code" data="{\"file_path\": \"src/services/invoiceExport.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01TpQRz88SBpu6VUPQVdAXtT" name="code--search_files" integration-id="code" data="{\"query\": \"parentInvoiceId|parent_invoice_id|Continuation\", \"include_patterns\": \"src/**/*.tsx,src/**/*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01FiUzroHYRLQZAbRFrUweme" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/InvoicesPage.tsx\"}">
</lov-tool-use>
I have enough context to plan.

<lov-plan>

## Goal
Add a "Combine" button on the Invoices list that fuses a parent invoice with all its continuation invoices into a single multi-page Excel file for export.

## How combining works today
- Continuation invoices are stored as separate rows in the `invoices` table with `parent_invoice_id` pointing at the parent. Their numbers look like `INV-0042-01`, `INV-0042-02`, etc.
- The Excel export currently exports one invoice = one worksheet/page using `/invoice-template.xlsx`.
- There's no existing way to download all pages of a multi-page invoice as one file.

## Plan

### 1. New export function: `exportCombinedInvoiceToExcel(parent, continuations)`
In `src/services/invoiceExport.ts`:
- Load `/invoice-template.xlsx` once into a workbook.
- The first sheet renders the parent invoice (reusing the existing single-invoice render logic, refactored into a helper `renderInvoiceToSheet(ws, invoice)`).
- For each continuation (sorted by suffix `-01`, `-02`, …), duplicate the template sheet and render the continuation onto it. Sheets are named `INV-0042`, `INV-0042-01`, etc.
- Save as `${parent.invoiceNumber}-combined.xlsx`.

Refactor: pull the body of the current `exportInvoiceToExcel` (lines ~39–273) into a `renderInvoiceToSheet(ws, invoice)` helper so both single and combined exports share it.

### 2. Combine button in the Invoices list
In `src/pages/InvoicesPage.tsx`:
- For each invoice row that **is a parent and has at least one continuation** (i.e. some other row has `parentInvoiceId === inv.id`), show a new "Combine" icon button (Layers icon) next to Excel/Edit.
- Clicking it loads the parent + continuations and calls the new combined export function.
- Continuation rows themselves don't show the combine button — only the parent does.
- Hide the standalone combine button when there are no continuations so it stays out of the way for normal one-page invoices.

### 3. (Optional polish) Visual grouping in the list
Add a small "+N pages" badge next to the parent invoice number when continuations exist, so it's obvious which invoice can be combined.

## Files touched
- `src/services/invoiceExport.ts` — refactor + new `exportCombinedInvoiceToExcel`
- `src/pages/InvoicesPage.tsx` — Combine button, page-count badge, handler

## Out of scope
- No DB changes.
- PDF combined export (Excel only, matching existing export-only-Excel rule).
- Auto-renumbering or merging into a single logical invoice — continuations stay separate records.


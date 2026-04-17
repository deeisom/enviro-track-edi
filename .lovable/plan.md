

## Goal
Replace the broken Excel-sheet-copy combine with a clean PDF combine: each invoice (parent + each continuation) renders as its own perfect single page, then all pages are merged into one PDF.

## Why the current version is broken
The current combine builds a multi-sheet `.xlsx` by copying the template worksheet cell-by-cell. Print area, page breaks, and print scaling don't survive the copy, so the sheets visually smoosh together when previewed/printed. Excel's print fidelity across copied sheets is fragile and not worth fighting.

## The fix
Use the existing single-page PDF renderer (`exportInvoiceToPDF` in `src/services/invoiceExport.ts`) as the source of truth. Each invoice already produces a clean, locked single-page PDF identical to the standalone export. We just stitch those pages together.

### 1. Refactor `exportInvoiceToPDF` to return the `jsPDF` doc (in addition to saving)
Split it into:
- `buildInvoicePDF(invoice): Promise<jsPDF>` — pure renderer, returns the doc (one page).
- `exportInvoiceToPDF(invoice)` — calls `buildInvoicePDF` then `doc.save()`. No behaviour change for existing callers.

### 2. New function: `exportCombinedInvoiceToPDF(parent, continuations)`
- Sort continuations by suffix (`-01`, `-02`, …) — same logic as today.
- Build the parent PDF via `buildInvoicePDF(parent)`. This is page 1, locked exactly as the standalone export.
- For each continuation: build its PDF, then append its first page to the parent doc using `doc.addPage()` followed by `doc.setPage()` and copying the content. jsPDF supports this via `pdf.addPage()` + redrawing, but the cleanest approach is to render directly into the same doc:
  - Inside `buildInvoicePDF`, accept an optional `existingDoc` + `appendPage` flag. When appending, call `existingDoc.addPage()` instead of creating a new doc, then run the same draw routine against it.
- Save as `${parent.invoiceNumber}-combined.pdf`.

This guarantees each page is byte-identical to its standalone PDF — same margins, header, layout, accreditation logos at the bottom.

### 3. Update the Combine button in `src/pages/InvoicesPage.tsx`
- Swap the handler from `exportCombinedInvoiceToExcel` → `exportCombinedInvoiceToPDF`.
- Keep the Layers icon, the "+N pages" badge, and the parent-only visibility rule.
- Update tooltip to "Combine into PDF".

### 4. Remove the broken Excel combine
Delete `exportCombinedInvoiceToExcel` and the `appendTemplateSheet` helper. The standalone Excel export per invoice still works as before.

## Files touched
- `src/services/invoiceExport.ts` — refactor PDF builder, add `exportCombinedInvoiceToPDF`, remove broken Excel combine.
- `src/pages/InvoicesPage.tsx` — point Combine button at the new PDF function, update tooltip.

## Out of scope
- No DB / type changes.
- Standalone single-invoice Excel and PDF exports stay exactly as they are today.


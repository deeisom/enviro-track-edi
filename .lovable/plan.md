
## Rebuild the invoice export from the uploaded reference invoice

I agree with your direction. The cleanest fix is to stop fighting the current template/image behavior and instead rebuild the Excel export around your uploaded invoice, using it as the new master layout.

### What I found
- The current export still depends on `public/invoice-template.xltx` and then tries to patch it after loading.
- The current logic writes:
  - `BILL TO`
  - PO #, DATE, INVOICE #, TERMS, DUE DATE
  - PROJECT SUMMARY
  - line items
  - total
- Your uploaded Excel file already matches the structure you want:
  - same header/company block
  - same BILL TO area
  - same metadata area
  - same PROJECT SUMMARY section
  - same item table
  - footer notes
- The logo problem is happening because the current approach relies on template image preservation/reinsertion rather than making the uploaded invoice itself the baseline to populate.

### Implementation plan

1. Replace the export baseline with your uploaded invoice
- Use the uploaded `.xlsx` as the new source template for Excel export.
- Store it in `public/` as the new invoice template file.
- Treat it as the visual source of truth for layout, spacing, borders, footer text, and logos.

2. Rework `exportInvoiceToExcel` to populate that template only
- Load the new workbook.
- Stop adding overlay images on top of old ones.
- Remove the current “re-insert logos” logic entirely.
- Only populate cells that should change based on invoice data.

3. Keep your current app-driven field mapping
- Preserve the same dynamic behavior for:
  - BILL TO name/address
  - PO #
  - DATE
  - INVOICE #
  - TERMS
  - DUE DATE
  - EDI PROJECT #
  - PROJECT SUMMARY
  - line items
  - total

4. Rebuild the line-item fill logic against the new template
- Identify the exact start/end rows in the uploaded invoice’s item area.
- Clear only the editable item rows, not the rest of the sheet.
- Populate item name, description, qty, rate, amount from `invoice.lineItems`.
- Preserve blank rows when no items exist.
- Keep totals aligned with the new template’s total row.

5. Preserve the correct formatting from the uploaded file
- Keep the worksheet’s native borders, merged cells, row heights, print area, and embedded images from the new template.
- Only set values where needed, instead of reconstructing formatting in code.
- Re-apply print scaling only if needed after testing.

6. Adjust export behavior for empty or short invoices
- Ensure blank invoices still export cleanly.
- If there are fewer items than the sample invoice, leave unused rows empty without breaking the layout.
- If there are more items than the available visible rows, use the same current capped behavior unless you want me to extend the sheet onto additional rows/pages later.

### Files to update
- `public/invoice-template.xltx` or replace with a new template file based on your uploaded invoice
- `src/services/invoiceExport.ts`

### Technical details
```text
Current approach:
load old template
-> clear cells
-> re-add images
-> rewrite borders/merges
-> save

New approach:
load uploaded reference invoice as template
-> overwrite only dynamic fields
-> clear/fill item rows
-> preserve built-in images and formatting
-> save
```

### Important note
This should fix the “picture stacked on top of the old picture” issue because I would no longer insert the accreditation image as an overlay. Instead, the correct logo would already live inside the new template you approved visually.

### One thing I will preserve exactly
I will keep doing the data population “how we’ve been doing it” from the app:
- BILL TO from invoice/client/project data
- PO #, DATE, TERMS, DUE DATE from the invoice form
- PROJECT SUMMARY from the invoice/project data
- dynamic line items from the invoice builder

### Small follow-up decision
I can keep the PDF export as-is for now and only rebuild the Excel export first, or I can later make the PDF match this same new layout too. For this pass, I recommend rebuilding Excel export first so we solve the real template issue at the source.

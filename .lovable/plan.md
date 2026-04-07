

# Fix Excel Line Item Layout & Accreditation Image

## Changes

### 1. Fix Excel description column layout
**File: `src/services/invoiceExport.ts` — `exportInvoiceToExcel`**

- **Unmerge all existing B:C merges** in rows 21-43 before writing (template has pre-existing merged ranges that conflict with new data)
- **Clear column C** in the existing clear loop (currently only clears A, B, D, E, F)
- **Dynamic row calculation**: For each line item, estimate rows needed for the description based on ~52 chars per line. Merge B:C for that span. Leave exactly 1 blank row between items (not fixed 3-row spacing).
- **Wrap text + alignment**: Set `wrapText: true` on both column A (Item) and merged B:C (Description) cells. Column A gets vertical center alignment. This fixes "Program Administration" being truncated to "Program".

**Row cursor logic:**
```text
For each line item:
  rowsNeeded = max(1, ceil(description.length / 52))
  Write item name in A{row} with wrapText
  Merge B{row}:C{row + rowsNeeded - 1} with wrapText
  Write qty, rate, amount in D, E, F at {row}
  rowCursor += rowsNeeded + 1  (1 blank row separator)
```

### 2. Fix accreditation logos in PDF
**File: `src/services/invoiceExport.ts` — `exportInvoiceToPDF`**

- Debug the image fetch/load logic — the PNG file exists and is valid (73KB) but isn't rendering
- Add console error logging instead of silent `catch` to surface failures
- Verify the fetch path resolves correctly in the Vite dev server

### Technical details

- ExcelJS `ws.unMergeCells(range)` will be used to remove template merges before writing
- Column A width in the template is ~18 chars — with `wrapText: true`, longer item names like "Program Administration" will display fully across multiple lines within the cell
- The PDF logo is fetched as a blob, converted to base64 data URL, then passed to `doc.addImage()` — need to verify this pipeline completes successfully


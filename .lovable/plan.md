

# Fix Row 16 Border and Column Overlap

## Problems
1. **Row 16 bottom border missing** — The code reads `cell.border?.top` etc. from template cells, but ExcelJS returns `undefined` for these, which explicitly nullifies existing template borders when reassigned.
2. **Rate/Amount columns overlapping** — Column A was widened to 35 but columns D/E/F have no explicit widths, causing them to be squeezed.

## Changes

**File: `src/services/invoiceExport.ts`**

1. **Simplify border assignments** — For row 16, row 45, and column F borders, stop reading existing border properties. Just set the one side that matters:
   - Row 16: `cell.border = { bottom: printBorder }`
   - Row 45: `cell.border = { bottom: printBorder }`
   - Column F: `cell.border = { right: printBorder }`

2. **Add explicit column widths** for D, E, F after the existing column A width:
   ```
   ws.getColumn('D').width = 8;
   ws.getColumn('E').width = 12;
   ws.getColumn('F').width = 12;
   ```

This replaces lines 120–151 with simpler, more reliable border code and adds 3 lines for column widths after the existing `ws.getColumn('A').width = 35` line.


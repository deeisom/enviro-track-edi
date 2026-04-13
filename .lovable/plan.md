

## Plan: Fix Freezing on Large Invoice Export

### Root Cause
The `ws.insertRow()` loop (lines 136-141) is O(n²) — each call shifts all subsequent rows, updates references, and recalculates merges. For invoices needing 50+ extra rows, this freezes the browser.

### Fix
**Remove the `insertRow` loop entirely** (lines 134-141). ExcelJS automatically expands the worksheet when data is written to any row number, so pre-inserting rows is unnecessary.

### Why Multi-Page Still Works
- `fitToWidth=1, fitToHeight=0` is already set — Excel prints as many vertical pages as needed
- All cell values, formatting, borders, and the Total formula are written to explicitly calculated row indices (`actualEndRow`, `actualTotalRow`)
- Nothing depends on pre-inserted rows existing

### Changes to `src/services/invoiceExport.ts`

**Delete lines 134-141** (the insert loop):
```typescript
// REMOVE:
const templateRows = templateEndRow - startRow + 1;
if (totalRowsNeeded > templateRows) {
  const extraRows = totalRowsNeeded - templateRows;
  for (let i = 0; i < extraRows; i++) {
    ws.insertRow(templateEndRow + 1 + i, []);
  }
}
```

Keep the `actualEndRow` / `actualTotalRow` calculations and everything else unchanged.

### Summary
- One deletion in `src/services/invoiceExport.ts`
- No database, type, or UI changes
- Long invoices will export instantly and span multiple printed pages


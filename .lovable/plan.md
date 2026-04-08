

# Fix: Excel "Removed Records: Merge cells" Repair Warning

## Root Cause

The template only contains one worksheet (`sheet1.xml`), but Excel reports a merge cell error in `sheet2.xml`. This means ExcelJS is either creating an extra empty sheet during the load/save cycle, or the internal `_merges` manipulation (lines 53-64) is producing corrupt merge data that gets written to a second sheet part.

The code currently deletes merge entries by directly manipulating `(ws as any)._merges` — an undocumented internal property. This bypasses ExcelJS's own bookkeeping and can leave orphaned or malformed merge references in the output file.

## Fix

1. **Use the public `ws.unMergeCells()` API** instead of deleting from the internal `_merges` object. This ensures ExcelJS properly tracks state.

2. **Delete any extra worksheets** after loading the template, keeping only the first sheet. This prevents ExcelJS from writing a corrupt `sheet2.xml`.

## Changes — `src/services/invoiceExport.ts`

Replace the internal `_merges` deletion block (lines 52-64) with:

```typescript
// Collect existing merges in the line-item area
const mergesToRemove: string[] = [];
ws.model.merges?.forEach((mergeRef: string) => {
  const startRowMatch = mergeRef.match(/\d+/);
  if (startRowMatch) {
    const row = parseInt(startRowMatch[0], 10);
    if (row >= startRow && row <= endRow) {
      mergesToRemove.push(mergeRef);
    }
  }
});
mergesToRemove.forEach((ref) => ws.unMergeCells(ref));
```

After loading the workbook, remove any extra worksheets:

```typescript
// Remove extra worksheets to prevent corrupt sheet2.xml
while (wb.worksheets.length > 1) {
  wb.removeWorksheet(wb.worksheets[wb.worksheets.length - 1].id);
}
```

## Files Changed

- `src/services/invoiceExport.ts` — replace internal merge hack with public API; remove extra worksheets after load


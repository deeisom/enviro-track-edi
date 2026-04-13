

## Plan: Fix separator row font and borders

### Problem
Inter-group separator rows (the empty rows between item groups) have two issues:
1. Cells A and B default to Times New Roman instead of Calibri 11
2. Cell A is missing its right-side border

### Changes to `src/services/invoiceExport.ts`

**Lines 243-246** — In the inter-group separator block, add Calibri font to cells A and B, and add right border to cell A:

```typescript
// Inter-group separator row
if (gi < groupData.length - 1) {
  ws.mergeCells(`B${rowCursor}:C${rowCursor}`);
  ws.getCell(`A${rowCursor}`).border = { left: leftBorder, right: leftBorder };
  ws.getCell(`A${rowCursor}`).font = calibriFont;
  ws.getCell(`B${rowCursor}`).font = calibriFont;
  rowCursor++;
}
```

**Lines 250-254** — Same fix for remaining empty rows at the bottom:

```typescript
for (let r = rowCursor; r <= actualEndRow; r++) {
  ws.mergeCells(`B${r}:C${r}`);
  ws.getCell(`A${r}`).border = { ...ws.getCell(`A${r}`).border, left: leftBorder, right: leftBorder };
  ws.getCell(`A${r}`).font = calibriFont;
  ws.getCell(`B${r}`).font = calibriFont;
}
```

### Summary
- Two small edits in `src/services/invoiceExport.ts`
- No database, type, or UI changes


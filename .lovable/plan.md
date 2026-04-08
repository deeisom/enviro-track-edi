

## Fix: Missing borders and broken merge formatting in Excel export

### Root cause

ExcelJS has a known behavior: when you set `cell.value = null` or call `unMergeCells`, border and style information stored on those cells can be lost. The current code clears all cells in rows 21–43 and removes all merges in that range, which strips the template's native borders and formatting.

### Fix approach

**Preserve cell styles during clear and re-apply them after writing values.** Instead of blindly setting cells to null, capture each cell's border/style first, clear the value, then restore the style.

### Changes — `src/services/invoiceExport.ts`

1. **Capture borders before clearing**: Before the clear loop (lines 71–75), snapshot the border style of every cell in rows 21–43.

2. **Restore borders after clearing**: After setting `value = null`, immediately re-apply the saved border to each cell.

3. **Restore borders after merging**: After merging B:C for descriptions, re-apply borders to the merged range cells since ExcelJS strips them during merge operations.

4. **Restore borders on formula-fill cells**: The loop at lines 109–114 that fills empty F cells with formulas should also preserve existing borders.

```typescript
// Pseudocode for the fix:

// 1. Snapshot borders
const savedStyles: Record<string, any> = {};
for (let r = startRow; r <= endRow; r++) {
  ["A","B","C","D","E","F"].forEach(col => {
    const cell = ws.getCell(`${col}${r}`);
    savedStyles[`${col}${r}`] = {
      border: cell.border,
      font: cell.font,
      alignment: cell.alignment,
      fill: cell.fill,
    };
  });
}

// 2. Clear values then restore styles
for (let r = startRow; r <= endRow; r++) {
  ["A","B","C","D","E","F"].forEach(col => {
    const cell = ws.getCell(`${col}${r}`);
    cell.value = null;
    const saved = savedStyles[`${col}${r}`];
    if (saved.border) cell.border = saved.border;
    if (saved.font) cell.font = saved.font;
    if (saved.alignment) cell.alignment = saved.alignment;
    if (saved.fill) cell.fill = saved.fill;
  });
}

// 3. After each merge, restore borders on merged cells
ws.mergeCells(`B${rowCursor}:C${descEndRow}`);
for (let r = rowCursor; r <= descEndRow; r++) {
  ["B","C"].forEach(col => {
    const saved = savedStyles[`${col}${r}`];
    if (saved?.border) ws.getCell(`${col}${r}`).border = saved.border;
  });
}

// 4. Same for formula fill — preserve border
const saved = savedStyles[`F${r}`];
cell.value = { formula: `...`, result: 0 };
if (saved?.border) cell.border = saved.border;
```

### Files changed
- `src/services/invoiceExport.ts`


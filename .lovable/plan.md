

# Fix Missing Borders When Printing with "Fit All Columns on One Page"

## Changes

**File: `src/services/invoiceExport.ts` — `exportInvoiceToExcel`**

After the existing left-border loop for column B, add:

1. **Right border on all column F cells, rows 12–45** — ensures the full right edge of the invoice is visible when print-scaled
2. **Bottom border on row 45, columns A–F** — ensures the bottom edge remains visible

Uses the same `thinBorder` style already defined for column B's left border.

### Technical detail

```text
for (let r = 12; r <= 45; r++) {
  const cellF = ws.getCell(`F${r}`);
  cellF.border = { ...cellF.border, right: thinBorder };
}

['A','B','C','D','E','F'].forEach(col => {
  const cell = ws.getCell(`${col}45`);
  cell.border = { ...cell.border, bottom: thinBorder };
});
```

No other files affected.


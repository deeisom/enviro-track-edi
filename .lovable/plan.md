

## Plan: Fix Footer Relocation and Multi-Page Support

### Root Cause

The template has footer content at fixed rows:
- **Row 44**: Total row ("questions please call 856-616-9516" in A44, "Total" label, SUM formula in F44)
- **Rows 47-50**: Accreditation logos
- **Row 51**: "EDI is a Service Disabled Veteran Owned Small Business!"

Three things break this:
1. The unmerge loop clears merges up to `actualEndRow + 1`, which includes the total row — distorting even short invoices
2. When line items exceed row 43, they overwrite the template footer, but no code relocates the footer
3. The `E*D` formula fill loop writes junk formulas into what should be footer cells

### Fix in `src/services/invoiceExport.ts`

**1. Limit unmerge scope to line-item area only** (stop at `actualEndRow`, not `actualEndRow + 1`)

**2. Clear the template footer content from its original fixed positions** (rows 44-51) when `actualTotalRow` differs from row 44

**3. Relocate footer content dynamically after line items:**
- `actualTotalRow` (row after last line item): Write "questions please call 856-616-9516" merged in A, "Total" label, and SUM formula in F — matching template formatting
- `actualTotalRow + 3` to `actualTotalRow + 6`: Accreditation logos area (the logos are an image in the template, so they stay fixed — but we should ensure no data overwrites them)
- `actualTotalRow + 7`: Veteran-owned text

**4. Stop the formula fill loop at `actualEndRow`** (it already does this, but ensure it doesn't touch footer rows)

**5. For the total row specifically:**
- Merge A through E for the "questions" text (matching template)
- Apply proper borders (top border on total row to create the visual separator)
- Write the Total label and SUM formula with bold Calibri formatting

### Why This Fixes Both Issues
- **Short invoices**: Footer stays at row 44 (template position) — unmerge loop no longer touches it
- **Long invoices**: Footer moves to the correct position after all line items, and old template footer is cleared

### Technical Details

```text
Template layout (fixed):
  Row 20: Headers (ITEM, ITEM DESCRIPTION, QTY, RATE, AMOUNT)
  Rows 21-43: Line items area (23 rows)
  Row 44: Total row (footer)
  Rows 45-51: Logos + veteran text

Dynamic layout:
  Rows 21 to actualEndRow: Line items (auto-expands)
  actualTotalRow = actualEndRow + 1: Total row (relocated)
  actualTotalRow + 3 to +7: Logos + veteran text (relocated if needed)
```

### Changes
- One file: `src/services/invoiceExport.ts`
- Modify unmerge scope, add footer relocation logic after the total formula write
- Clear original template footer rows when they differ from new positions
- No database, type, or UI changes


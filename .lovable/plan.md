

## Plan: Fix Multi-Page Template Duplication

### Root Cause

The `copyTemplatePage` function has two bugs:

1. **Duplicate values from merged cells**: When ExcelJS reads a cell that's part of a merged range (e.g., B10 in merge A10:B10), it returns the merged value. So when copying ALL cells from page 1 to page 2, content like "BILL TO" and "PROJECT SUMMARY" gets written into every cell of the original merge range. If the merge then fails to apply on page 2, all those cells show the duplicated text independently.

2. **Silent merge failures**: The `try { safeMerge(...) } catch {}` swallows errors, so when merges fail on page 2, there's no indication — the cells just show duplicated content.

### Fix (single file: `src/services/invoiceExport.ts`)

**Modify `copyTemplatePage`** to be merge-aware:

1. Before copying cell values, build a set of "slave" cells (cells that are part of a merge but NOT the top-left master cell) from `templatePageMerges`
2. When copying cells, skip setting `.value` for slave cells — only copy font/alignment/border/fill
3. Apply merges BEFORE or alongside cell copies so they're in place
4. Remove the silent `try/catch` around `safeMerge` calls (or at minimum log failures) to diagnose any remaining issues

```typescript
function copyTemplatePage(pageIndex: number) {
  const offset = pageIndex * ROWS_PER_PAGE;

  // Build set of "slave" cells (non-master cells in merges) 
  const slaveCells = new Set<string>();
  for (const merge of templatePageMerges) {
    const [mStart, mEnd = mStart] = merge.split(":");
    const startCol = mStart.replace(/\d+/, "");
    const startRowNum = Number(mStart.replace(/[A-Z]+/, ""));
    const endCol = mEnd.replace(/\d+/, "");
    const endRowNum = Number(mEnd.replace(/[A-Z]+/, ""));
    const cols = ["A","B","C","D","E","F"].filter(c => c >= startCol && c <= endCol);
    for (let r = startRowNum; r <= endRowNum; r++) {
      for (const c of cols) {
        if (c === startCol && r === startRowNum) continue; // skip master
        slaveCells.add(`${c}${r}`);
      }
    }
  }

  // Copy cells — skip values for slave cells
  for (let r = 1; r <= ROWS_PER_PAGE; r++) {
    const tgtRow = ws.getRow(offset + r);
    tgtRow.height = ws.getRow(r).height;
    ["A","B","C","D","E","F"].forEach(col => {
      const src = ws.getCell(`${col}${r}`);
      const tgt = ws.getCell(`${col}${offset + r}`);
      if (!slaveCells.has(`${col}${r}`)) {
        tgt.value = src.value;  // only master/standalone cells
      }
      tgt.font = src.font ? {...src.font} : undefined;
      tgt.alignment = src.alignment ? {...src.alignment} : undefined;
      tgt.border = src.border ? {...src.border} : undefined;
      tgt.fill = src.fill ? {...src.fill} : undefined;
      tgt.numFmt = src.numFmt;
    });
  }

  // Apply merges with offset
  for (const merge of templatePageMerges) {
    // ...same offset logic, but call safeMerge
  }

  // Copy images with offset
  // ...same as current
}
```

### Summary
- Single file change: `src/services/invoiceExport.ts`
- Only modifies the `copyTemplatePage` function
- Prevents duplicate text in unmerged slave cells
- No database, type, or UI changes


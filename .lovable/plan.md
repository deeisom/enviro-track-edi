

## Plan: Multi-Page Invoice with Repeated Template Headers

### Problem
When there are too many line items, they overflow past row 43. Instead of extending a single page, each page should use rows 21–43 (23 rows) for line items, and if a group won't fit on the current page, it should start as the first item on a new page that repeats the full template header (rows 1–20).

### Approach

**Page-packing algorithm** in `src/services/invoiceExport.ts`:

1. **Pre-calculate group sizes** (already done — groupHeight + 1 separator row per group)
2. **Pack groups into pages**: Iterate through groups, tracking remaining rows on the current page (max 23). For each group: if `groupHeight + separatorRow` fits in remaining space, add it to current page. If not, start a new page. A group is never split across pages.
3. **Build multi-page worksheet**:
   - Page 1 uses the existing template as-is (rows 1–44)
   - For pages 2+, insert rows and copy the header content (rows 1–20) by rewriting the same metadata (company info, bill-to, invoice number, etc.) into the new header block. Add a page break before each new page header.
   - Each page's line-item area spans 23 rows; unused rows are filled with empty formatted cells (same as current behavior)
4. **Total row**: Placed on the last page after its line-item area. The SUM formula references all F-column line-item cells across all pages.
5. **Page breaks**: Insert horizontal page breaks between pages so Excel prints each page correctly.

### Layout per page
```text
Rows 1-20:  Header (company, bill-to, metadata, project summary, column headers)
Rows 21-43: Line items (23 rows max)
Row 44:     Total (last page only) / empty (intermediate pages)
```

For page N (N > 1), the row offset = `(N-1) * 44`, so page 2 header starts at row 45, line items at row 65–87, etc.

### Changes

**`src/services/invoiceExport.ts`** — Rewrite the section after group data calculation:

1. **Page-packing loop**: Distribute groups across pages, respecting the 23-row limit
2. **Template duplication**: For each additional page, copy header cell values, merges, and formatting from rows 1–20 into the offset rows. Rewrite dynamic metadata cells.
3. **Render per page**: Each page renders its assigned groups into its 21–43 row range (offset), with the same grouping/merging/separator logic
4. **Total formula**: On the last page's row 44 (offset), SUM across all pages' F columns
5. **Print page breaks**: `ws.addPageBreak(row)` before each new page's header

### Technical Details
- No database, type, or UI changes
- Single file change: `src/services/invoiceExport.ts`
- The header duplication copies values and basic formatting but relies on the template's existing column widths and print settings
- `fitToHeight = 0` remains so Excel doesn't compress multi-page content


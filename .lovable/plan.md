

## Plan: Smart Row Merging for Item and Description Cells

### Problem

The current code always gives each description exactly 1 row and each Item name exactly the content height of the group. This causes:

1. **Item text truncation** — "Asbestos Air Monitor" gets cut off because Column A is narrow and the cell only spans 1 row (for single-item groups)
2. **Description text truncation** — Long descriptions like "Psychrometer/TSI-Calc for temperature and humidity readings at sample locations." don't fit in 1 row of merged B:C
3. **Over-merging** — Short items like "Final Report" shouldn't get extra rows just because other items do

### Rules from the Updated Example (INV-0004_EXAMPLE-3.xlsx)

```text
Row 21: A="Asbestos Air Monitor" (merged 2 rows)  | B:C="Asbestos Air Monitor"  | D=1 E=$65 F=$65
Row 22: A=(merged)                                  | B:C=(empty)                 |
Row 23: (inter-group separator)
Row 24: A="Final Report" (1 row, NO merge)          | B:C="Final Report"          | D=1 E=$150 F=$150
Row 25: (inter-group separator)
Row 26: A="Equipment" (merged 4 rows)               | B:C="Zefon sampling pump"   | D=1 E=$30 F=$30
Row 27: A=(merged)                                  | B:C=(empty, internal sep)   |
Row 28: A=(merged)                                  | B:C="Psychrometer/TSI-Calc..."(merged 2 rows) | D=1 E=$82 F=$82
Row 29: A=(merged)                                  | B:C=(merged continues)      |
Row 30: (inter-group separator)
```

**Key rules:**
- Each description estimates how many rows it needs based on text length vs column B:C width (~45 chars per row)
- If description needs multiple rows, merge B:C across that many rows; Qty/Rate/Amount go on the first row only
- Each Item name estimates how many rows it needs based on text length vs column A width (~15 chars per row)
- Group content height = sum of all description heights + internal separators between them
- Item merge height = max(group content height, item name rows needed)
- If item name is short and group content is just 1 description that fits in 1 row, NO merge at all (e.g., "Final Report")
- 1 empty separator row between groups
- 1 empty separator row between descriptions within a group
- Font: Calibri 11 throughout

### Changes to `src/services/invoiceExport.ts`

1. **Add text-to-rows estimation function**: Calculate how many rows a text string needs given an approximate character width. Use ~15 chars for Column A, ~45 chars for merged B:C.

2. **Calculate description row heights**: For each line item, compute `descRows = Math.ceil(description.length / 45)` (minimum 1). If descRows > 1, merge `B{r}:C{r+descRows-1}`.

3. **Calculate group content height**: Sum of all descRows + (items - 1) internal separator rows.

4. **Calculate Item name rows needed**: `nameRows = Math.ceil(name.length / 15)` (minimum 1).

5. **Determine actual group height**: `groupHeight = Math.max(contentHeight, nameRows)`. If groupHeight > contentHeight, add trailing empty rows.

6. **Merge logic**:
   - Only merge A if groupHeight > 1
   - Only merge B:C per description if descRows > 1
   - Qty/Rate/Amount always on the first row of each description

7. **Keep existing**: dynamic row insertion for multi-page, total formula adjustment, Calibri font, left-aligned Item text, inter-group separators.

### Technical Details

- Character-width estimates are approximate but sufficient for Calibri 11 at the template's column widths
- The estimation is conservative (slightly over-estimating rows is better than truncation)
- No database, type, or UI changes needed


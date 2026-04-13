

## Plan: Dynamic Multi-Page Invoice Export with Grouped Line Items

### Problem

1. Line items beyond row 43 are silently dropped — no multi-page support
2. Every line item currently uses a fixed 4-row description block regardless of content length
3. Line items with the same "Item" name (e.g., two "Equipment" entries) should be grouped under a single merged Item cell
4. Item column text should be left-aligned, not centered

### Layout Rules (from your example)

Based on the uploaded INV-0004_EXAMPLE.xlsx:

```text
Row  | Col A (Item)       | Col B:C (Description)                    | D (Qty) | E (Rate) | F (Amount)
-----|--------------------|------------------------------------------|---------|----------|----------
 21  | Asbestos Air       | Asbestos Air Monitor                     |    1    |  $65.00  |  $65.00
 22  | Monitor (merged)   |                                          |         |          |    $-
 23  |                    |          (separator between groups)       |         |          |    $-
 24  | Final Report       | Final Report                             |    1    | $150.00  | $150.00
 25  | (merged)           |                                          |         |          |    $-
 26  |                    |          (separator between groups)       |         |          |    $-
 27  | Equipment          | Zefon sampling pump                      |    1    |  $30.00  |  $30.00
 28  | (merged 3 rows)    |          (separator within group)        |         |          |    $-
 29  |                    | Psychrometer/TSI-Calc for temp and...    |    1    |  $82.00  |  $82.00
 30  |                    |          (separator between groups)       |         |          |    $-
```

- Each description = 1 row (with wrap text), qty/rate/amount on that same row
- 1 empty separator row between descriptions within a group
- 1 empty separator row between groups
- Item cell merges vertically across all rows in the group (descriptions + internal separators)
- Item text: left-aligned, vertical middle, wrap text

### Changes

**`src/services/invoiceExport.ts`** — Complete rewrite of the line-item section in `exportInvoiceToExcel`:

1. **Group consecutive line items by `name`**: Build groups where items sharing the same `name` value are combined. Each group has one merged Item cell and multiple description rows.

2. **Calculate rows dynamically**: For each group: `(number of descriptions) + (number of descriptions - 1 internal separators)`. Between groups: 1 separator row. Total rows = sum of all group heights + inter-group separators.

3. **Remove fixed row 21-43 constraint**: If total rows needed exceeds 23 (the original range), insert additional rows into the worksheet. Move the Total formula row (currently F44) down accordingly.

4. **Render each group**:
   - Merge `A{start}:A{end}` for the Item name (left-aligned, vertical middle, wrap text)
   - For each description in the group: write description in `B:C` (merged, 1 row), qty in D, rate in E, formula in F
   - Insert blank separator rows between descriptions and between groups

5. **Update Total formula**: Adjust `SUM(F21:F{lastRow})` to cover the actual range used.

6. **Left-align Item column**: Change `horizontal: "center"` to `horizontal: "left"` for Item cells.

7. **Fill remaining empty rows** with merged B:C and zero formulas in F (same as current behavior, just extended if needed).

### Technical Details

- The grouping is done at export time by scanning `lineItems` and collecting consecutive items with matching `name` values into groups
- Row heights will use ExcelJS default (auto-fit with wrap text)
- The template's existing header/footer/borders are preserved; only the line-item area and total row are modified
- Print settings remain: fitToWidth=1, fitToHeight=0 (allows multi-page)
- No database or type changes needed — this is purely an export formatting change



Goal: make the exported Excel invoice print correctly without the user having to manually choose “Fit All Columns on One Page,” and keep the key borders visible if scaling is applied anyway.

Why the current fix is not enough:
- The code already adds those borders.
- Since they still disappear only when print-scaling is used, the real issue is likely Excel print setup + very thin edge borders being reduced/faded at print time.
- In other words, this is now more of a print-layout problem than a “missing border assignment” problem.

Plan

1. Add print settings directly to the exported worksheet
- Configure the invoice sheet so it opens already set to print one page wide.
- Set:
  - print area to the actual invoice block only (`A1:F45`)
  - fit-to-page enabled
  - fit-to-width = 1
  - fit-to-height = automatic/unlimited
  - paper size + margins appropriate for the invoice template
- This should remove the need for you to manually pick “Fit All Columns on One Page.”

2. Strengthen the borders that matter for printing
- Replace the current hairline-style edge treatment with a stronger explicit print border for:
  - Row 16 bottom border (`A16:F16`)
  - Column F right border (`F12:F45`)
  - Row 45 bottom border (`A45:F45`)
- Use a darker, slightly heavier border style (for example `medium` + black) for those print-critical boundaries only.
- Keep interior formatting unchanged so the sheet still looks the same on screen.

3. Make the border assignment fully explicit
- Do not rely on template leftovers or partial spread merges for print-critical cells.
- Rebuild each affected border object with explicit sides so ExcelJS writes them consistently.
- This avoids cases where a border exists visually in the template but is not retained reliably after export changes.

4. Preserve the current line-item layout logic
- Keep:
  - column A width
  - merged B:C item description rows
  - Calibri 11 formatting
  - existing left-border continuity in column B
- Only change print behavior and print-visible border strength.

5. Fallback if Excel printing still varies by printer
- If desktop Excel still renders borders inconsistently on certain printers/drivers, the reliable fallback is to use the existing PDF export for printing.
- I would keep Excel for editing/accounting use and use PDF as the print-perfect version.

Technical details

```text
In src/services/invoiceExport.ts:

A) Add worksheet page setup
- printArea: 'A1:F45'
- fitToPage: true
- fitToWidth: 1
- fitToHeight: 0 (or undefined/unlimited)
- paperSize/margins set for invoice print layout

B) Create a stronger print border
- const printBorder = { style: 'medium', color: { argb: 'FF000000' } }

C) Apply it to:
- F12:F45 => right border
- A16:F16 => bottom border
- A45:F45 => bottom border

D) Keep existing line-item formatting logic intact
```

Expected result
- The exported workbook should already be print-configured when opened.
- You should no longer need to manually select “Fit All Columns on One Page.”
- If you do use scaling, the right edge, bottom edge, and line above “Project Summary” should remain visible much more reliably.

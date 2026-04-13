

## Plan: Lock Page Dimensions to Prevent Bleeding

### Problem
Setting `fitToHeight = 0` lets Excel auto-scale vertically, which causes pages to bleed into each other. The page breaks alone aren't sufficient — we need to lock the physical page dimensions so each 44-row block maps exactly to one printed page.

### Changes to `src/services/invoiceExport.ts`

1. **Set explicit paper size**: Add `ws.pageSetup.paperSize = 1` (US Letter 8.5" x 11")

2. **Set `fitToHeight` to match page count**: Instead of `fitToHeight = 0` (unlimited), set `fitToHeight = pages.length` after the page-packing step. This tells Excel "fit all content into exactly N pages tall", preventing scaling issues.

3. **Set explicit row heights for every row**: Lock each row to a fixed height so the 44 rows per page fill exactly one printed page. With Letter paper (11"), top margin 0.85", bottom margin 0":
   - Usable height ≈ 10.15" = ~731 points (1 inch = 72 points)
   - 731 points / 44 rows ≈ 16.6 points per row
   - Header rows (1–20) can keep their template heights
   - Line-item rows (21–43) and total row (44) get explicit heights
   - Apply these heights for every page's rows

4. **Move `fitToHeight` assignment after packing**: Currently `fitToHeight = 0` is set at line 49 before we know the page count. Move/update it after line 159 where `pages.length` is known.

### Summary
- Single file: `src/services/invoiceExport.ts`
- Add `paperSize = 1` (Letter)
- Change `fitToHeight` from `0` to `pages.length`
- Set explicit row heights for line-item rows on every page
- No database, type, or UI changes


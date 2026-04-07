

# Fix Invoice Line Items & Add Accreditation Images

## Problems Identified

1. **Excel export: line items crammed together** — The template uses 3 rows per line item (1 data row + 2 empty spacer rows showing `$-`), but our code writes items to consecutive rows (21, 22, 23...). Need to space them every 3 rows (21, 24, 27...) and clear any pre-existing content in the template rows.

2. **Phantom items in Excel** — The template likely has pre-filled text in some rows (category headers like "Lab Fees", "Equipment", etc.). The export code doesn't clear these rows before writing, so template content bleeds through.

3. **Missing accreditation images** — Three logos (BBB, EPA Lead-Safe, SDVOSB) should appear at the bottom of the invoice. These need to be added to both the PDF export and preserved/embedded in Excel.

## Plan

### 1. Fix Excel export spacing and phantom items
**File: `src/services/invoiceExport.ts`**
- Clear all line item rows (21-43) before writing — set columns A, B, D, E, F to empty
- Space line items every 3 rows: item 0 at row 21, item 1 at row 24, item 2 at row 27, etc. (matching the template's visual spacing pattern)

### 2. Add accreditation images
- Copy the uploaded image (`image-2.png`) to `public/images/accreditation-logos.png`
- **PDF export**: Embed the image near the bottom of the page using `jsPDF.addImage()`, positioned below the footer text
- **Excel export**: The template file should already contain these images; if ExcelJS strips them, we'll note that as a known limitation (ExcelJS has limited image preservation support from templates)

### 3. Copy corrected template
- Copy the uploaded `EDI_Invoice_Draft_LIW-2.xlsx` to inspect if the template itself needs updating to match the correct layout with images

## Technical Details

**Row spacing formula for Excel:**
```
row = startRow + (index * 3)  // 21, 24, 27, 30, ...
```

**Clear rows loop:**
```
for (let r = startRow; r <= 43; r++) {
  ws.getCell(`A${r}`).value = null;
  ws.getCell(`B${r}`).value = null;
  ws.getCell(`D${r}`).value = null;
  ws.getCell(`E${r}`).value = null;
}
```

**PDF image embedding:**
```
doc.addImage(imgData, 'PNG', x, y, width, height);
```
Positioned centered at the bottom of the page, below the tagline text.


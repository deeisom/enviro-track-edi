

# Fix: Images Disappearing When Printing Excel to PDF

## Root Cause

ExcelJS does not reliably preserve images embedded in `.xltx` templates during the load → modify → save cycle. When you open the exported `.xlsx` and print to PDF, the images (company logo in the upper-right, accreditation logos at the bottom) are gone because ExcelJS stripped them during export.

The accreditation logo overlay we added (row 46) should survive since it's programmatically inserted, but the **original template images** (header logo, any other embedded graphics) are lost.

## Fix

Programmatically re-add all images that the template originally contained, the same way we already do for the accreditation logos. This requires:

1. **Company header logo** — Save the upper-right company logo as `public/images/company-logo.png` (you'll need to provide this image file)
2. **Add it back in code** — In `exportInvoiceToExcel`, fetch and insert the company logo at the correct position (upper-right area, approximately rows 1-8, columns E-F)
3. **Verify accreditation logo** — Confirm the existing overlay at row 46 is appearing correctly

### Changes to `src/services/invoiceExport.ts`

After the existing accreditation logo block (~line 22-34), add a similar block for the company header logo:

```typescript
// Add company header logo (top-right)
try {
  const headerLogoResp = await fetch("/images/company-logo.png");
  if (headerLogoResp.ok) {
    const headerLogoBuffer = await headerLogoResp.arrayBuffer();
    const headerLogoId = wb.addImage({ buffer: headerLogoBuffer, extension: 'png' });
    ws.addImage(headerLogoId, {
      tl: { col: 4, row: 0 },   // position in upper-right area
      ext: { width: 200, height: 80 }, // adjust to match original
    });
  }
} catch (err) {
  console.error("Could not add header logo:", err);
}
```

## What I Need From You

**Please upload the company header logo** (the one that appears in the upper-right corner of your invoice template) so I can save it to `public/images/company-logo.png`. Without it, there's no image to re-insert.

## Files Changed

- `public/images/company-logo.png` — new file (from your upload)
- `src/services/invoiceExport.ts` — add header logo insertion alongside existing accreditation logo code


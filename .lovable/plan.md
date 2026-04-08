

# Fix Invoice Print: Logo Cutoff and Wrong Bottom Logo

## Issues

1. **Upper-right logo cut off when printing** — The template content extends beyond the printable area. Need to programmatically set Excel page setup to auto-fit columns to one page width.
2. **Bottom-left logo is incorrect** — The logo embedded in the `.xltx` template doesn't match the correct accreditation logos (BBB, EPA Lead-Safe, SDVOSB). Need to replace it.

## Approach

### 1. Fix print scaling (upper-right logo cutoff)

In `src/services/invoiceExport.ts`, set the worksheet's `pageSetup` properties to automatically fit all columns on one page. This eliminates the need for users to manually change print scaling:

```typescript
ws.pageSetup.fitToPage = true;
ws.pageSetup.fitToWidth = 1;
ws.pageSetup.fitToHeight = 0; // 0 = auto height (don't compress vertically)
```

### 2. Replace bottom accreditation logos

The template `.xltx` has embedded images that ExcelJS cannot reliably remove. The fix:

- Copy the user's correct logo (image-9.png) to `public/images/accreditation-logos.png`, replacing the current incorrect one (this also fixes the PDF export)
- In the Excel export code, use ExcelJS's `addImage` API to place the correct logo at the bottom of the invoice, positioned over the template's existing (incorrect) image so it covers it

```typescript
const logoResp = await fetch("/images/accreditation-logos.png");
const logoBuffer = await logoResp.arrayBuffer();
const logoId = wb.addImage({ buffer: logoBuffer, extension: 'png' });
ws.addImage(logoId, {
  tl: { col: 0, row: 46 },  // position adjusted to bottom area
  ext: { width: 400, height: 80 }
});
```

## Files Changed

- `public/images/accreditation-logos.png` — replaced with correct logo
- `src/services/invoiceExport.ts` — add `pageSetup` for print fit + add correct logo image overlay


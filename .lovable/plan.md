

## Issue
"Combine failed: wrong PNG signature" — the accreditation logos PNG is being rejected by jsPDF on the second invocation. Looking at `renderInvoicePDFPage` in `src/services/invoiceExport.ts`, the function fetches `/images/accreditation-logos.png` and converts it to a data URL via `FileReader.readAsDataURL` every time it's called. The standalone PDF works fine (single call), but the combined export calls it 2+ times in quick succession.

The Lovable stack-overflow context confirms: "wrong PNG signature" means jsPDF received data that didn't start with the PNG magic bytes. Most likely cause here: when called rapidly in a loop, the `fetch` → `Blob` → `FileReader` chain occasionally yields a result that jsPDF can't parse, OR the data URL prefix check / image type passed to `addImage` mismatches.

## Fix

### 1. Load the logos PNG once, outside the per-page render
In `src/services/invoiceExport.ts`:
- Hoist the logo-loading logic into a module-level memoized loader: `let logosImgPromise: Promise<string|null> | null = null; function loadLogos() { if (!logosImgPromise) logosImgPromise = (async () => { ... })(); return logosImgPromise; }`.
- `renderInvoicePDFPage` calls `await loadLogos()` instead of re-fetching.
- This eliminates the race / repeated decode and guarantees the same valid data URL is reused on every page.

### 2. Harden the data URL handling
- Validate the result starts with `data:image/png;base64,` before passing to `doc.addImage` (matches the pattern in the Lovable stack-overflow guidance).
- If validation fails, skip the logo for that page rather than throwing — the combine should never fail just because the footer logo can't load.

### 3. Wrap `addImage` in try/catch
- Even with valid data, swallow any `addImage` error and log it. The invoice content is the important part; the logo is decorative.

## Files touched
- `src/services/invoiceExport.ts` — memoize logo loader, validate data URL, guard `addImage`.

## Out of scope
- No UI changes.
- No changes to standalone PDF/Excel exports' visible output (logo still appears identically when it loads correctly).


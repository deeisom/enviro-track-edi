

## Plan: Fix Multi-Page with Clean Page Breaks

### Root Cause

The template already has working print settings: `scale: 84%`, `fitToPage: true`, `fitToWidth: 1`, `fitToHeight: 0` (unlimited pages). At 84% scale, the 52-row template fits perfectly on one US Letter page.

The current code breaks this by:
1. Overriding margins (changing available space so 52 rows no longer fit at 84%)
2. Setting `fitToHeight = pages.length` (forces Excel to rescale, causing compression/stretching)
3. Setting `scale = undefined` (removes the working 84% scale)

### Fix (single file: `src/services/invoiceExport.ts`)

**Stop overriding the template's page setup.** Instead:

1. **Remove margin overrides** (lines 53-60) — keep whatever margins the template already has
2. **Remove `fitToHeight` override** — leave it at `0` (unlimited pages tall) as the template specifies
3. **Remove `scale = undefined`** — keep the template's `scale: 84`
4. **Keep `paperSize = 1`** (US Letter) as a safety net
5. **Use explicit page breaks only** — after `copyTemplatePage`, call `ws.getRow(pageIdx * ROWS_PER_PAGE + 1).addPageBreak()` (already in code)
6. **Remove `printArea` override** — or set it correctly to cover all pages without forcing rescaling

The result: each 52-row block uses the template's proven scale/margin settings and fits exactly on one page. Page breaks create clean separations. No rescaling, no bleeding.

### Changes

Lines 46-60 become:
```typescript
// Keep template's original page setup (scale: 84%, fitToWidth: 1, fitToHeight: 0)
// Only ensure paper size is US Letter
(ws.pageSetup as any).paperSize = 1;
```

Lines 162-163 — remove `fitToHeight = pages.length` and `scale = undefined`

Line 166 — remove `printArea` override (or keep it but without fitToHeight forcing rescaling)

### Summary
- Single file: `src/services/invoiceExport.ts`
- Removes ~15 lines of page setup overrides
- Relies on template's proven settings + explicit page breaks
- No database, type, or UI changes


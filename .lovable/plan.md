

## Plan: Fix DOCX Export — Logo + Formatting Match

### Two problems

**1. Logo missing in export** — `loadImage()` uses `Buffer.from(arrayBuffer)` which fails silently in the browser (no native `Buffer`). The `catch` returns `null`, so the logo is skipped entirely. Fix: use `Uint8Array` instead of `Buffer` — `ImageRun` in docx-js accepts `Uint8Array`.

**2. Overall DOCX formatting doesn't match the in-app preview** — The in-app preview was updated with correct sizing but the DOCX `buildCoverPage` function still needs alignment. Specifically:
- Font sizes in the DOCX should match what the preview shows (the preview was updated but the export sizes may not correspond)
- The page border thickness should match the thin black border in the preview
- Spacing between sections needs to match the generous gaps in the preview

### Changes to `src/services/proposalExport.ts`

**Fix `loadImage`**: Change return type from `Buffer | null` to `Uint8Array | null`, replace `Buffer.from(arrayBuffer)` with `new Uint8Array(arrayBuffer)`.

**Fix `buildCoverPage` ImageRun**: Change `data: logoData` type annotation from `Buffer` to `Uint8Array`. The `ImageRun` constructor accepts `Uint8Array` natively.

**Verify font sizes match preview**: Cross-reference the DOCX sizes (in half-points) with the CSS preview sizes:
- "Environmental Services Proposal": preview = `text-2xl` (24px) → DOCX `size: 28` (14pt) — should be `size: 48` (24pt)
- Work Performed Title: preview = `text-2xl` → DOCX `size: 32` (16pt) — should be `size: 48`
- Location Name: preview = `text-xl` (20px) → DOCX `size: 26` (13pt) — should be `size: 40`
- Secondary Location: preview = `text-lg` (18px) → DOCX `size: 26` — should be `size: 36`
- Address lines: preview = `text-base` (16px) → DOCX `size: 22` (11pt) — should be `size: 32`
- "For the Client": preview = `text-base` → DOCX `size: 22` — should be `size: 32`
- Client Name: preview = `text-lg` (18px) → DOCX `size: 24` (12pt) — should be `size: 36`
- Date/bottom info: preview = `text-sm` (14px) → DOCX `size: 22` — should be `size: 28`
- Bottom address: preview = `text-xs` (12px) → DOCX `size: 18` — should be `size: 24`

Note: DOCX `size` is in half-points (size 24 = 12pt). CSS px ≈ pt for screen, so `text-2xl` = 24px ≈ 24pt = `size: 48`. However, a printed page is smaller than screen, so we should use slightly smaller values. A reasonable mapping: use approximately 60-70% of the screen px values as pt, which means the current sizes are actually reasonable for print. The real issue is the logo.

**Revised approach**: The main fix is the logo. Font sizes for print don't need to match screen 1:1 — they need to look correct on a letter-size page. The current sizes (28, 32, 26, 22, 24, 18) are reasonable for print. The user's complaint about "formatting is still messed up" is likely dominated by the missing logo.

### Files modified

- `src/services/proposalExport.ts` — Fix `loadImage` to use `Uint8Array` instead of `Buffer`, update type signatures throughout


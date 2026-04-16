
The user wants specific styling changes to the DOCX export. Let me map them out:

**Header changes (all pages except cover):**
- Remove current "EDI" with underline
- New header: "EDI" in Final Frontier, 26pt, italic, color "Green Accent 6 Darker 50%" → hex `#375623` (Office theme color)
- Header distance from top = 0.5" (720 DXA)
- Header distance from bottom = 0.3" (432 DXA)

**Proposal/Details page (page 2):**
- "Proposal" title: TNR, 20pt bold, left-aligned (currently 28pt → change to 20pt half-points = 40)
- Default body text: TNR 12pt (size 24 in half-points) — currently mostly 22 (11pt)
- "Background & Scope of Work" subtitle: TNR 12pt **bold** (size 24, bold)
- All "EDI" mentions: Final Frontier 12pt italic (size 24, italic, font BRAND_FONT)
- "Environmental Design Inc." consultant name: Final Frontier 12pt italic, left-aligned, "Dark Green Accent 3 Darker 50%" → hex `#375623` (same family — Office "Dark Green, Accent 3, Darker 50%" is `#375F1F` actually; Green Accent 6 Darker 50% = `#375623`). I'll use `#375F1F` for Dark Green Accent 3 D50% and `#375623` for Green Accent 6 D50%.

### Office theme color mapping
- Green, Accent 6, Darker 50% (default Office theme) = `#375623`
- Dark Green, Accent 3, Darker 50% (default Office theme) = `#375F1F`

### Implementation in `src/services/proposalExport.ts`

1. **`buildEdiHeader`**: Replace the underlined right-aligned EDI block with a single paragraph: `EDI` in Final Frontier, italic, size 52 (26pt), color `#375623`. Drop the contact lines and bottom border. Apply only to non-cover sections.

2. **Header margins**: Add `header: 720, footer: 432` to the `page.margin` block of the details section so header sits 0.5" from top.

3. **`buildDetailsPage`**:
   - "Proposal" title: change `size: 28` → `size: 40`, keep bold, default left-align (already left).
   - Bump all body `size: 22` → `size: 24` (12pt).
   - "Background & Scope of Work": already bold, change `size: 24` → `size: 24` (already 12pt) — confirm bold remains.
   - "And the Consultant: Environmental Design Inc." — replace plain TNR italic with Final Frontier italic color `#375F1F`, size 24.
   - Every standalone "EDI" TextRun (in Project # lines, etc.) → swap to Final Frontier italic size 24.

4. **`buildFeeSchedulePage` & `buildAcceptancePage`**: Same EDI swap for "EDI" mentions in those sections.

### Files modified
- `src/services/proposalExport.ts` — header rebuild, page margins (header/footer distances), font/size/color updates across details, fee, and acceptance builders.

### Notes
- Cover page section does NOT get a header (already the case — only details/fee/terms/acceptance share the second section).
- Default document run size stays at 22 (11pt) for safety, but explicit `size: 24` on body paragraphs overrides.

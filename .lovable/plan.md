

## Plan: Align Cover Page to Formatting Guide Specifications

### What's changing

The formatting guide provides exact font, size, weight, alignment, and styling for every cover page element. The current implementation has incorrect sizes throughout and uses the wrong font for "EDI" and "Environmental Design Inc." (should be "Final Frontier", not Times New Roman). The uploaded logo image also needs to replace the current one.

### Formatting guide spec vs current DOCX export

| Element | Font Guide Spec | Current DOCX `size` (half-pts) | Correct `size` |
|---|---|---|---|
| Template Title ("Environmental Services Proposal") | TNR 22pt Bold, Left | 28 (14pt) | **44** |
| "Environmental Design Inc." (header) | **Final Frontier** 14pt Italic, Left | 22 TNR (11pt) | **28**, font: Final Frontier |
| Primary Title (service type) | TNR 28pt Bold, Center | 32 (16pt) | **56** |
| Secondary Title | TNR 20pt, Center | 24 (12pt) | **40** |
| "AT" | TNR 20pt, Center | 22 (11pt) | **40** |
| Primary Location | TNR 22pt Bold, Center | 26 (13pt) | **44** |
| Secondary Location | TNR 22pt Bold, Center | 26 (13pt) | **44** |
| Work Location Address | TNR 20pt, Center | 22 (11pt) | **40** |
| "For the Client" | TNR 20pt, Center | 22 (11pt) | **40** |
| Client Name | TNR 20pt Bold, Center | 24 (12pt) | **40** |
| Client Address | TNR 20pt, Center | 22 (11pt) | **40** |
| "EDI" (project # line) | **Final Frontier** 16pt Italic, Center | 22 TNR | **32**, font: Final Frontier |
| "Project # ..." | TNR 16pt, Center | 22 (11pt) | **32** |
| Date | TNR 16pt, Left | 22 (11pt) | **32** |
| "Environmental Design Inc." (bottom) | **Final Frontier** 16pt, Left | 22 TNR | **32**, font: Final Frontier |
| EDI Address/Contact | TNR 12pt, Left | 18 (9pt) | **24** |

Key findings:
1. **"Final Frontier" font** is used for all "EDI" and "Environmental Design Inc." text — not Times New Roman
2. **All font sizes need increasing** — current values are roughly half what they should be
3. **Primary Title should NOT be underlined** — the guide says Bold only (no underline mentioned); looking at the example image confirms no underline
4. **"EDI" in the project # line** uses Final Frontier 16pt Italic, separate from the "Project # ..." which is TNR 16pt
5. **The bottom section** needs phone and website info added (TNR 12pt)
6. **Logo** needs replacing with the uploaded high-res PNG version

### In-app preview changes

The CSS preview in `CoverPagePreview` needs matching updates — Final Frontier font-face won't be available in-browser, so we'll use a similar italic/decorative fallback or load the font. Since Final Frontier is the project's brand font (already used in sidebar/headings per memory), we can reference it. The preview sizes also need proportional adjustment.

### Files to modify

**`public/images/edi-globe-logo.png`** — Copy uploaded logo to replace/add as PNG

**`src/services/proposalExport.ts`** — `buildCoverPage`:
- Update all font sizes per the table above
- Change "EDI" and "Environmental Design Inc." text to use `font: "Final Frontier"` instead of default TNR
- Remove `underline` from Primary Title (guide says Bold only)
- Change "EDI" in header to use Final Frontier 14pt Italic
- Add phone/website lines to bottom-left section (TNR 12pt)
- Update logo reference to `.png` and adjust dimensions
- Fix "smallCaps" usage — the guide shows small caps styling on most centered text

**`src/components/proposals/CoverPageStep.tsx`** — `CoverPagePreview`:
- Match font sizes proportionally to the guide (scale for 612px preview width vs 8.5" page)
- Use Final Frontier font for "EDI" and "Environmental Design Inc." spans
- Remove underline from Primary Title
- Add phone/website to bottom-left info
- Update logo src to `.png`

### Technical notes

- DOCX `size` field is in **half-points** (size 44 = 22pt, size 56 = 28pt)
- Final Frontier font: the DOCX will reference it by name; it must be installed on the machine opening the document (standard for EDI's computers). For the web preview, the font is already loaded via the app's CSS.
- The logo will be loaded as PNG (`type: "png"` in ImageRun)
- The bottom section phone/website lines from the guide: "Phone: 1-888-306-4545" and "www.editesting.com" at TNR 12pt


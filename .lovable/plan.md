

## Plan: Proposal Formatting Overhaul

### Two changes requested

**1. Remove numbering from Terms & Conditions** — clauses should render as plain paragraphs separated by spacing, no numbers or individual titles (matching the real proposal format).

**2. Match the formatting of the uploaded example proposal** — the current preview and DOCX export need significant layout changes to match the real document.

### Key formatting differences observed from the example

**Cover Page:**
- "Environmental Services Proposal" is bold, LEFT-aligned at top (not centered), with "Environmental Design Inc." italic below it, followed by a horizontal rule
- Service type is large, bold, underlined, centered, in SMALL CAPS style
- Site name / building area / address are centered in small caps
- "FOR THE CLIENT" / client info centered in small caps
- Project # centered italic
- Bottom layout: Date on the left, company name in GREEN italic on the left, address below; EDI globe logo positioned at bottom-right
- The EDI company name on the cover is in GREEN text

**Interior Pages Header:**
- "EDI" in GREEN italic, RIGHT-aligned, large font
- A horizontal rule underneath
- Phone/website info on the LEFT below the line (page 2 only) or just the green "EDI" + rule on subsequent pages

**Proposal Details Page (Page 3):**
- "Proposal" bold large LEFT-aligned (not centered)
- "Between the Client:" / "And the Consultant:" / "For the Project:" use a two-column tabbed layout — label on the left, details indented to a consistent tab stop
- "Background & Scope of Work" bold
- Body text is JUSTIFIED

**Fee Schedule (Page 4):**
- Table header row has a LIGHT SAGE GREEN shading (not blue) — approximately `#C5E0B4`
- Total row also has the green shading
- Text throughout is justified

**Terms and Conditions (Page 5):**
- "Terms and Condition" bold header
- NO numbering, NO clause titles — just flowing paragraphs separated by blank lines
- Text is JUSTIFIED

**Acceptance Page (Page 6):**
- Signature block has signature line + "Dated" on the same row using tab stops (not stacked vertically)
- The date field is to the RIGHT of the signature line on the same horizontal level

**Global:**
- All body text appears JUSTIFIED
- The green color used for "EDI" branding is approximately `#4A7C59` (dark forest green)

### Implementation

**Files to modify:**

1. **`src/components/proposals/ProposalPreview.tsx`** — Full reformatting:
   - Cover page: left-aligned header block, small-caps styling, logo at bottom-right, green company name
   - Interior pages: green italic "EDI" right-aligned in header
   - Proposal details: left-aligned "Proposal" title, tabbed two-column layout for client/consultant/project
   - Fee table: sage green header shading instead of plain black borders
   - Terms: remove numbering and clause titles, render as plain paragraphs with spacing
   - Acceptance: horizontal signature/date layout
   - Add `text-justify` to body text sections

2. **`src/services/proposalExport.ts`** — Mirror all the same formatting changes for the DOCX export:
   - Cover page layout matching the example
   - Green "EDI" in headers
   - Justified text alignment
   - Sage green table header shading
   - Terms without numbering/titles
   - Horizontal signature block layout

3. **Copy the EDI globe logo** from the parsed document to `public/images/` for use on the cover page (the current `edi-logo.jpg` may be different from the globe logo in the example)

### Technical details

- Green color for "EDI" branding: `#4A7C59`
- Fee table header shading: `#C5E0B4` (sage green)
- Terms rendering: iterate clause bodies as paragraphs only, skip `clauseCounter` and title rendering entirely
- Small caps effect on cover page via CSS `font-variant: small-caps` and in DOCX via `smallCaps: true`
- Justified text via `text-align: justify` in CSS and `AlignmentType.JUSTIFIED` in docx-js




## Plan: Step-Based Proposal Builder — Cover Page First

### What changes

Restructure the proposal builder from a flat 4-tab layout into a **step-based workflow** (Setup, Cover Page, Proposal, Fee Schedule, Terms, Acceptance, Full Preview). This plan implements the **Cover Page step** with a split-view editor (form on left, live preview on right) that exactly matches the uploaded example template.

### Cover Page Layout (from example)

```text
┌─────────── thin black border ───────────────┐
│                                              │
│  Environmental Services Proposal  (bold)     │
│  Environmental Design Inc.  (green italic)   │
│  ──────────────────────────────────────────  │
│                                              │
│        TARGETED MOLD EVALUATION              │  ← Large bold underlined small-caps
│           SECONDARY TITLE                    │  ← Optional, smaller small-caps
│               AT                             │
│    WESLEY D. TISDALE ELEMENTARY SCHOOL       │  ← Bold small-caps
│          ROOM 1A & ROOM 2                    │  ← Optional bold small-caps
│          200 ISLAND AVENUE                   │  ← Small-caps
│          RAMSEY, NJ 07446                    │  ← Small-caps
│                                              │
│          FOR THE CLIENT                      │
│       RAMSEY SCHOOL DISTRICT                 │  ← Bold small-caps
│      25 N. FRANKLIN TURNPIKE                 │  ← Small-caps
│     RAMSEY, NEW JERSEY 07446                 │  ← Small-caps
│                                              │
│   EDI Project # PR-251120-1527  (italic)     │
│                                              │
│  November 20, 2025          [EDI GLOBE LOGO] │
│                                              │
│  Environmental Design Inc.  (green italic)   │
│  5434 King Avenue, Suite 101                 │
│  Pennsauken, New Jersey 08109                │
└──────────────────────────────────────────────┘
```

### Cover Page Form Fields

| Field | Maps to | Notes |
|---|---|---|
| Work Performed Title | `serviceType` | Required |
| Secondary Work Performed Title | NEW: `secondaryServiceType` | Optional |
| Location Name | `siteName` | Required |
| Secondary Location | `buildingArea` | Optional (e.g. "Room 1A & Room 2") |
| Work Performed Address (Street) | `siteAddress` | Street line |
| Work Performed Address (City/State/Zip) | NEW: `siteAddressLine2` | e.g. "Ramsey, NJ 07446" |
| Client Name | Auto from client selection | Read-only on cover step |
| Client Address | Auto from client | Multi-line, read-only |
| Project Number | Auto from project | Read-only |
| Proposal Date | `proposalDate` | Editable |

Fixed (always present, not editable): "Environmental Services Proposal" header, "Environmental Design Inc." green italic, horizontal rule, "AT", "FOR THE CLIENT", company address block, EDI globe logo, black border.

### Implementation

**1. `src/types/proposal.ts`** — Add `secondaryServiceType` and `siteAddressLine2` to `Proposal` interface.

**2. `src/pages/ProposalBuilder.tsx`** — Change tabs from 4 to 7: Setup, Cover Page, Proposal Page, Fee Schedule, Terms & Conditions, Acceptance, Full Preview. Import new `CoverPageStep` component.

**3. NEW `src/components/proposals/CoverPageStep.tsx`** — Split-view component:
- **Left panel**: Form fields for all editable cover page data (work title, secondary title, location name, secondary location, street address, city/state/zip, date). Read-only display for client name, client address, project number.
- **Right panel**: Live-updating cover page preview with exact template formatting:
  - Thin black border around entire page
  - Left-aligned header block with green italic company name + rule
  - Centered content area with small-caps typography
  - Bottom section: date left, company info left, globe logo bottom-right
  - Font: Times New Roman throughout

**4. `src/components/proposals/ProposalPreview.tsx`** — Update cover page section to use the new fields (`secondaryServiceType`, `siteAddressLine2`), add black border, and ensure exact match with the template. Also update to render multi-line client addresses properly.

**5. `src/services/proposalExport.ts`** — Update `buildCoverPage` to include new fields, add page border to the cover section, and split address into two lines.

**6. Copy the high-res globe logo** from the parsed document to `public/images/edi-globe-logo.jpg` (replace existing).

**7. Update `ProposalBuilder.tsx` initial state** to include `secondaryServiceType: ""` and `siteAddressLine2: ""`.

### Technical details

- Green color: `#4A7C59`
- Cover page border: CSS `border: 1px solid black` for preview; DOCX page border via `pageBorders` property
- Small-caps: CSS `font-variant: small-caps`; DOCX `smallCaps: true`
- The cover page preview component will be extracted as `CoverPagePreview` so it can be reused in both the step editor and the full preview
- Font: Times New Roman, serif throughout the cover page

### Files affected

- `src/types/proposal.ts` — add 2 new fields
- `src/pages/ProposalBuilder.tsx` — restructure to 7 tabs
- `src/components/proposals/CoverPageStep.tsx` — NEW: form + live preview
- `src/components/proposals/ProposalPreview.tsx` — update cover section
- `src/services/proposalExport.ts` — update cover section + page border
- `public/images/edi-globe-logo.jpg` — replace with high-res version


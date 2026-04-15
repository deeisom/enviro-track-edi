

## Plan: Fix Cover Page — Date Format, Bottom Cutoff, and DOCX Export

### Three issues to fix

**1. Date format** — Currently `new Date().toLocaleDateString("en-US")` produces "4/15/2026". Change to use `toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })` which produces "April 15, 2026".

**2. Bottom-left info cut off in preview** — The cover page container uses `minHeight: 792px` but with `padding: 48px 64px` the content overflows. Fix by adjusting the bottom section layout: reduce the `mt-4` gap, ensure the flex layout gives the center area `flex-1` without pushing the bottom off-page. May also need to set `height: 792px` with `overflow: hidden` to enforce the page boundary and slightly reduce padding.

**3. DOCX export formatting doesn't match** — The cover page DOCX section (`buildCoverPage`) has structural problems:
- The logo is placed as a separate right-aligned paragraph below the company info, instead of being positioned alongside it (bottom-right while company info is bottom-left). Fix by using a **2-column table** (no borders) for the bottom section: left cell has date + company info, right cell has the logo right-aligned.
- Client address is rendered as a single line instead of multi-line. Split on `\n` and render each line as a separate centered paragraph.
- Add more spacer lines between sections to better match the visual spacing of the preview.

### Files to modify

**`src/pages/ProposalBuilder.tsx`** — Change date format initialization:
```typescript
proposalDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
```

**`src/components/proposals/CoverPageStep.tsx`** — Fix bottom section overflow:
- Change container from `minHeight` to fixed `height: 792px` 
- Reduce bottom section top margin
- Ensure the flex layout properly constrains content

**`src/services/proposalExport.ts`** — Overhaul `buildCoverPage`:
- Replace the sequential logo paragraph with a **borderless 2-column table** at the bottom: left cell = date + company info (left-aligned), right cell = logo (right-aligned, vertically bottom-aligned)
- Split `clientAddress` on newlines and render each as a separate centered paragraph with small-caps
- Adjust spacer count for better vertical distribution

### Technical details
- The 2-column bottom table in DOCX: left column ~70% width for text, right column ~30% for logo, no borders, no shading
- Date format uses built-in `Intl` formatting — no external library needed
- The preview height fix uses CSS `height` instead of `minHeight` to prevent overflow


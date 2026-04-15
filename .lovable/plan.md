

## Plan: Fix Cover Page Preview to Match Example Template

### Problem

Comparing the current preview to the example document image, the cover page has multiple sizing, spacing, and proportion issues:

1. **Font sizes too small** — "Environmental Services Proposal" should be ~24pt bold, currently `text-base` (~16px). Work performed title should be ~28pt bold underlined small-caps, currently `text-lg` (~18px). Location name, client name, addresses all too small.
2. **"AT" text too small** — should be ~12pt, currently `text-xs` (~10px)
3. **Insufficient vertical spacing** — sections in the example have generous gaps between work title, "AT", location, "FOR THE CLIENT", client info, and project number
4. **Logo too small** — example shows ~150px tall logo, current is 100px
5. **Bottom section layout** — date and company info need more vertical separation from the center content; logo should sit lower and larger

### Changes to `src/components/proposals/CoverPageStep.tsx`

Update the `CoverPagePreview` component with corrected sizing:

| Element | Current | Target |
|---|---|---|
| Page dimensions | 612x792px, padding 54px 72px | Keep 612x792 but adjust padding to ~48px 64px for more content room |
| "Environmental Services Proposal" | `text-base` (16px) | `text-2xl` (~24px) bold |
| "Environmental Design Inc." (header) | `text-xs` (12px) | `text-sm` (~14px) italic green |
| Work Performed Title | `text-lg` (18px) | `text-2xl` (~24px) bold underlined small-caps |
| Secondary Title | `text-sm` (14px) | `text-base` (~16px) small-caps |
| "AT" | `text-xs` (10px) | `text-sm` (~14px) |
| Location Name | `text-sm` (14px) | `text-xl` (~20px) bold small-caps |
| Secondary Location | `text-sm` (14px) | `text-lg` (~18px) bold small-caps |
| Address lines | `text-xs` (10px) | `text-base` (~16px) small-caps |
| "For the Client" | `text-xs` (10px) | `text-base` (~16px) small-caps |
| Client Name | `text-sm` (14px) | `text-lg` (~18px) bold small-caps |
| Client Address | `text-xs` (10px) | `text-base` (~16px) small-caps |
| Project # line | `text-xs` (10px) | `text-sm` (~14px) italic |
| Date | `text-xs` (10px) | `text-sm` (~14px) |
| Company name (bottom) | `text-xs` (10px) | `text-sm` (~14px) italic green |
| Address (bottom) | 9px | `text-xs` (~12px) |
| Logo height | 100px | 140px |
| Vertical spacing between sections | mb-1, mt-6 | mb-2, mt-8 for more generous gaps |

Also adjust the `scale` factor in the step view from `scale-[0.85]` to `scale-[0.75]` to fit the larger content in the side panel.

### Files modified

- `src/components/proposals/CoverPageStep.tsx` — resize all typography and spacing in `CoverPagePreview` to match the example template proportions


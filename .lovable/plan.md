
The user wants the page border to sit close to the page edges (like Word's default "Box" setting at ¾pt) rather than hugging the text. In docx-js, page borders default to being measured from the text, not the page edge. Need to add `offsetFrom: "page"` and small `space` values to the border config so it sits near the paper edge.

Looking at current code in `buildCoverPage`:
```ts
const pageBorder = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
return {
  properties: {
    page: {
      ...
      borders: {
        pageBorderTop: pageBorder,
        pageBorderRight: pageBorder,
        ...
      },
    },
  },
  ...
};
```

The issue: docx-js page borders need `pageBorders.offsetFrom: "page"` plus per-side `space` values (in points, typically 24pt = standard Word default for "from page edge"). Without `offsetFrom: "page"`, Word measures from text which causes the tight hug around content.

## Plan: Fix Page Border Offset

Update the page border configuration in `buildCoverPage` (`src/services/proposalExport.ts`) to measure from the page edge instead of the text:

- Add `pageBorders: { offsetFrom: "page" }` to the section's `page` properties
- Add `space: 24` (points from page edge) to each border side — matches Word's default for "Measure from: Edge of page"
- Keep style SINGLE, size 6 (¾pt), color automatic/black

This produces a border that sits ~1/3" from the page edge (well outside the 1" text margins), matching the screenshot.

### File modified
- `src/services/proposalExport.ts` — update `buildCoverPage` border config

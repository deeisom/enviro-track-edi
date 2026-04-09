

## Revised Plan: Sharpen Final Frontier Font While Keeping Bold + Italic

### Problem
Synthetic bold causes blurry rendering. Removing it fixes sharpness but loses the bold/italic aesthetic.

### Revised approach
Keep `italic` on all headings. Replace synthetic `font-bold` with a CSS `text-stroke` outline that simulates boldness without smearing glyphs. Add antialiasing for extra crispness.

### Changes

**`src/index.css`** — Add a utility rule:
```css
.font-frontier {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  -webkit-text-stroke: 0.5px currentColor;
}
```

**All page headings + sidebar logo** — Replace `font-bold italic` with just `italic` in the className (the stroke handles the bold effect):
- `src/components/AppSidebar.tsx`
- `src/pages/Dashboard.tsx`, `ProjectsList.tsx`, `CreateProject.tsx`, `ClientsPage.tsx`, `RatesPage.tsx`, `InvoicesPage.tsx`, `ProjectDetail.tsx`

This keeps the italic slant, simulates bold weight cleanly via stroke, and eliminates the blurry synthetic bold rendering.


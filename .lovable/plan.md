

## Fix: Final Frontier Font Not Appearing Bold/Italic

### Problem
The `@font-face` declaration sets `font-weight: bold` and `font-style: italic` as descriptors. This tells the browser the font file *is* the bold-italic variant, so it won't apply any additional synthetic bold/italic rendering. The font's glyphs render flat.

### Solution
1. **Change `@font-face` descriptors** to `font-weight: normal; font-style: normal` — this ensures the font loads as the base variant, and the browser can then apply synthetic bold and italic on top of it.

2. **Keep `font-bold italic` classes** on all headings and the sidebar logo — these will now trigger the browser's synthetic bold/italic rendering over the font's base glyphs.

### Files to modify
- `src/index.css` — change `font-weight` and `font-style` in the `@font-face` block from `bold`/`italic` to `normal`/`normal`

Single two-line change; no other files need updating.


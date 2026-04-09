

## Plan: Tasteful Integration of "Final Frontier" Font

Final Frontier is a bold, futuristic display font — great for branding moments but too heavy for body text. The strategy is **logo/brand name only**, with a couple of subtle accent uses.

### Where to use it

1. **App logo text ("EnviroTrack")** in the sidebar header — this is the primary branding moment and the most natural fit. Currently uses `font-bold tracking-tight`.

2. **Page titles (h1 only)** — "Dashboard", "Projects", "Clients", etc. These are short, single-word headers that would look sharp in a display font without hurting readability.

3. **Nothing else** — nav items, table headers, body text, form labels, and buttons all stay in the default sans-serif for legibility.

### Technical approach

1. **Add the font file** — download/place the Final Frontier `.ttf` or `.woff2` in `public/fonts/` and register it via `@font-face` in `src/index.css`.

2. **Create a Tailwind utility** — add `fontFamily: { frontier: ['"Final Frontier"', 'sans-serif'] }` to `tailwind.config.ts` so we can use `font-frontier` as a class.

3. **Apply to sidebar logo** — update `AppSidebar.tsx` to use `font-frontier` on the "EnviroTrack" text, with slightly adjusted letter-spacing (`tracking-wider`).

4. **Apply to page titles** — add `font-frontier` to the `<h1>` elements on Dashboard, ProjectsList, ClientsPage, RatesPage, InvoicesPage, CreateProject, and ProjectDetail. Keep `text-2xl` sizing so it's prominent but not overwhelming.

### Files to modify
- `public/fonts/` — add font file(s)
- `src/index.css` — add `@font-face` declaration
- `tailwind.config.ts` — add `frontier` font family
- `src/components/AppSidebar.tsx` — apply to "EnviroTrack"
- `src/pages/Dashboard.tsx`, `ProjectsList.tsx`, `ClientsPage.tsx`, `RatesPage.tsx`, `InvoicesPage.tsx`, `CreateProject.tsx`, `ProjectDetail.tsx` — apply to page `<h1>` headings

This keeps the sci-fi flair concentrated on brand identity and page landmarks, while all functional UI text stays clean and readable.


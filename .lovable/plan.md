

## Plan: Update Project Numbering to EDI-YYYY-NNNN

### Current behavior
Projects are numbered `PR-0001`, `PR-0002`, etc. using a single global counter stored in `localStorage` under `epm_project_counter`.

### New behavior
Projects will be numbered `EDI-2026-0001`, `EDI-2026-0002`, etc. The year portion reflects the current year. The sequential counter resets each year.

### Technical approach

**`src/services/storage.ts`** — Rewrite `getNextProjectNumber()`:
- Store a year-specific counter key (e.g., `epm_project_counter_2026`)
- On each call, get the current year, read/increment that year's counter
- Return `EDI-${year}-${counter padded to 4 digits}`

```typescript
export function getNextProjectNumber(): string {
  const year = new Date().getFullYear();
  const yearKey = `${KEYS.counter}_${year}`;
  const counter = parseInt(localStorage.getItem(yearKey) || "0", 10) + 1;
  localStorage.setItem(yearKey, String(counter));
  return `EDI-${year}-${String(counter).padStart(4, "0")}`;
}
```

No other files need changes — the project number is generated once at creation time and stored as a string, so all existing references (tables, invoices, activity logs) continue to work. Existing projects keep their old `PR-XXXX` numbers.


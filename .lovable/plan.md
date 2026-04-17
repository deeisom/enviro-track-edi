

## Goal
Group continuation invoices visually under their parent in the Invoices list, with indentation and a connector so they're clearly attached.

## Approach

### 1. Reorder the list so children follow their parent
In `src/pages/InvoicesPage.tsx`, after invoices are loaded/filtered/sorted, run a grouping pass:
- Build a map of `parentId → children[]`, sorted by invoice number suffix (`-01`, `-02`, …).
- Build the final display list by iterating top-level invoices (those with no `parentInvoiceId`) and immediately appending their children after each parent.
- Orphan continuations (parent missing/filtered out) fall back to their normal sort position so nothing disappears.

This grouping happens regardless of the current sort/filter — children always travel with their parent.

### 2. Visual treatment for continuation rows
For any row where `parentInvoiceId` is set:
- Indent the first cell (~24px left padding) and render a small corner-connector glyph (`└`) before the invoice number to show the parent/child relationship.
- Use a slightly muted background (`bg-muted/30`) so the group reads as one unit.
- Replace the invoice-number cell display with just the suffix part (e.g. `└ -01`) to reduce noise — full number still shown on hover/tooltip.

### 3. Parent row badge
Keep the existing "+N pages" badge next to parent invoice numbers when continuations exist (already added with the Combine feature) so parents are also visually marked.

### 4. Works in both Card and Table views
- **Table view**: indentation + connector in the first column.
- **Card view**: continuation cards rendered with `ml-6` margin and a left border (`border-l-2 border-muted`) so they visually nest under the parent card.

## Files touched
- `src/pages/InvoicesPage.tsx` — grouping logic + row/card styling for continuations.

## Out of scope
- No DB changes.
- No change to sorting controls — grouping is applied as a final pass on top of the user's chosen sort.
- No collapse/expand toggle (can add later if the nesting feels too busy).


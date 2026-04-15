

## Plan: Save Custom Clauses to Library

### What changes

When a user manually adds a custom clause to a proposal, add a checkbox option "Save to clause library for future proposals." If checked, the custom clause gets inserted into the `proposal_clauses` table so it appears in the clause list for all future proposals.

### Implementation

**1. Add `createClause` function to `src/services/proposalStorage.ts`**

New function that inserts a clause into `proposal_clauses`:
```typescript
export async function createClause(input: { title: string; body: string; category: string }): Promise<ProposalClause>
```
Sets `is_default: false`, `sort_order: 999`, `service_types: []`.

**2. Update `src/components/proposals/TermsClauseEngine.tsx`**

The current component has no "Add Custom Clause" feature yet. This plan adds:

- An "Add Custom Clause" button at the bottom of the terms section
- A form with Title, Category (dropdown), and Body (textarea) fields
- A **checkbox**: "Save to clause library for future proposals"
- On submit:
  - Always add the clause as an inline custom entry in `termsSelections` (with a generated ID and `isCustom: true` flag)
  - If the checkbox is checked, also call `createClause()` to persist it to the database, and use the returned real ID instead

**3. Update `src/types/proposal.ts`**

Extend `ProposalClauseSelection` to support inline custom clauses:
```typescript
export interface ProposalClauseSelection {
  clauseId: string;
  included: boolean;
  editedBody?: string;
  variables?: Record<string, string>;
  // For inline custom clauses
  isCustom?: boolean;
  customTitle?: string;
  customBody?: string;
  customCategory?: string;
}
```

**4. Update preview and export**

`ProposalPreview.tsx` and `proposalExport.ts` already render terms from selections + clauses. Custom inline clauses (where no matching library clause exists) will render using `customTitle`/`customBody` from the selection.

### Files modified
- `src/types/proposal.ts` — add custom clause fields to `ProposalClauseSelection`
- `src/services/proposalStorage.ts` — add `createClause()` function
- `src/components/proposals/TermsClauseEngine.tsx` — add custom clause form with "save to library" checkbox
- `src/components/proposals/ProposalPreview.tsx` — render inline custom clauses
- `src/services/proposalExport.ts` — render inline custom clauses in DOCX


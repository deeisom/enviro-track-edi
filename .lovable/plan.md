

## Plan: Fix Data Creation Errors

### Problem
After the cloud migration, creating projects, clients, and rates fails silently because:
1. **Missing error handling** — `ClientsPage` and `RatesPage` don't wrap database calls in try/catch, so errors are swallowed with no user feedback
2. **Invalid UUID bug** — When creating a project with "None" selected for Parent Project, the value `"_none"` gets passed as a `parent_project_id` to the database instead of `null`, causing a UUID validation error
3. **Same issue for client selection** — The `clientId` field could have the same problem

### Changes

**1. `src/pages/CreateProject.tsx`**
- Fix the `parentProjectId` and `clientId` values: treat `"_none"` and empty string as `null` before inserting
- Change: `parentProjectId: (form.parentProjectId && form.parentProjectId !== "_none") ? form.parentProjectId : null`
- Same pattern for `clientId`

**2. `src/pages/ClientsPage.tsx`**
- Wrap `handleCreate` in try/catch with error toast
- Wrap inline `deleteClient` call in try/catch

**3. `src/pages/RatesPage.tsx`**
- Wrap `handleSave` in try/catch with error toast
- Wrap `handleDelete` in try/catch with error toast

**4. `src/services/storage.ts`**
- Same fix for `parentProjectId` in `createProject` — sanitize `"_none"` to `null`


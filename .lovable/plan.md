

## Plan: Migrate EnviroTrack to Lovable Cloud

### What this does
Moves your app from browser-only storage to a shared cloud database with user login, so your entire team can access the same data from any device (phone, tablet, or computer).

### Step 1: Enable Lovable Cloud
You'll click the **Cloud** tab at the top of the editor and enable it. This provisions a database, authentication, and hosting automatically.

### Step 2: Create database tables
Create migrations for all your data:

- **profiles** — links to auth users (name, created_at)
- **user_roles** — admin vs regular user permissions (using a security-safe pattern)
- **projects** — all project fields including the EDI-YYYY-NNNN numbering
- **project_counter** — tracks the next number per year (replaces localStorage counter)
- **clients** — company info
- **contacts** — people linked to clients
- **activity_log** — status changes and invoice events
- **rates** — your rate card items (seeded with defaults)
- **invoices** — invoices and estimates with line items stored as JSONB

### Step 3: Add Row-Level Security (RLS)
- All authenticated users can read all data
- All authenticated users can create/update data
- Only admins can delete projects, clients, or invoices
- Uses a `has_role()` security function to check admin status safely

### Step 4: Add authentication
- Login/signup page with both **email & password** and **Google sign-in**
- Protected routes — redirect to login if not signed in
- Auth context provider throughout the app

### Step 5: Rewrite the storage layer
Replace all localStorage calls in `storage.ts` and `invoiceStorage.ts` with Supabase client queries. The TypeScript interfaces stay the same — only the data source changes.

### Step 6: Admin role management
- First user to sign up becomes admin (via a database trigger)
- Admins see a simple user management section to grant/revoke admin access
- Regular users can do everything except delete records

### Step 7: Publish
Deploy to a public URL your team can bookmark or add to their phone home screen.

---

### Phone access
Your coworkers will use it in their phone's web browser — it already uses responsive design so it adapts to small screens. They can also "Add to Home Screen" for an app-like experience with no app store needed.

### Files affected
- New: database migrations (6-8 migration files)
- New: `src/pages/AuthPage.tsx`, `src/contexts/AuthContext.tsx`
- Rewrite: `src/services/storage.ts`, `src/services/invoiceStorage.ts`
- Modify: `src/App.tsx` (add auth routes + protection)
- New: `src/pages/UsersPage.tsx` (admin-only user management)

### What won't change
- All your UI pages, components, and styling stay the same
- The Final Frontier font, leaf icons, address autocomplete — all untouched
- Project numbering format (EDI-YYYY-NNNN) stays identical


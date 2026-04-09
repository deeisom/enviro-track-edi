

## Plan: Fix Persistent Loading Spinner

### Problem
The `onAuthStateChange` callback in `AuthContext.tsx` uses `await checkAdmin(...)` which blocks Supabase's internal auth event processing, causing intermittent deadlocks where the app gets stuck on the loading spinner.

### Fix

**File: `src/contexts/AuthContext.tsx`**

Remove `await` from both `checkAdmin` calls — fire-and-forget so `setLoading(false)` runs immediately after setting the user/session state. The admin status will update moments later without blocking the auth flow.

```typescript
// Line 49: change from
await checkAdmin(session.user.id);
// to
checkAdmin(session.user.id);

// Line 61: same change
await checkAdmin(session.user.id);
// to
checkAdmin(session.user.id);
```

This is a two-line change in one file. The admin check still runs asynchronously — it just no longer blocks the loading state from resolving.


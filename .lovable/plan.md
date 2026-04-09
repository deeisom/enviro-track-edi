

## Plan: Fix Loading Spinner Stuck Issue

### Problem
In `src/contexts/AuthContext.tsx`, the `onAuthStateChange` callback uses `await checkAdmin(...)` before calling `setLoading(false)`. If the `checkAdmin` database query throws an error (network glitch, timeout, etc.), `setLoading(false)` is never reached and the app stays stuck on the spinner forever.

### Fix

**File: `src/contexts/AuthContext.tsx`**

1. Wrap the `checkAdmin` call in a try/catch inside the `onAuthStateChange` callback so that `setLoading(false)` always runs regardless of query success
2. Do the same in the `getSession` `.then()` block
3. Add a try/catch inside `checkAdmin` itself so it defaults to `false` on failure instead of throwing

```typescript
const checkAdmin = async (userId: string) => {
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  } catch {
    setIsAdmin(false);
  }
};
```

And in the `onAuthStateChange` callback, ensure `setLoading(false)` is in a `finally` block or after a try/catch around the `checkAdmin` call.

This is a one-file fix in `src/contexts/AuthContext.tsx`.


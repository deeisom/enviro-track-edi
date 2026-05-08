export function createClientId(prefix = "id"): string {
  try {
    const randomUUID = globalThis.crypto?.randomUUID;
    if (randomUUID) return randomUUID.call(globalThis.crypto);
  } catch {
    // Fall back below when the browser exposes crypto without randomUUID support.
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

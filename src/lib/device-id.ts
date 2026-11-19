const KEY = "sobat-device-id";

/** ID perangkat stabil per peramban. Bukan pengenal perangkat keras. */
export function getDeviceId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return undefined;
  }
}

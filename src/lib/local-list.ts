import { useSyncExternalStore } from "react"

/**
 * Tiny persisted string-set (saved places, compare list). Anonymous saves live in localStorage
 * and are merged into the account after login (Phase 4). Every storage access is guarded.
 */
export function createLocalList(key: string, max = 50) {
  const listeners = new Set<() => void>()
  let cache: string[] | null = null
  const read = (): string[] => {
    if (cache) return cache
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "[]")
      cache = Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max) : []
    } catch {
      cache = []
    }
    return cache
  }
  const write = (next: string[]) => {
    cache = next.slice(0, max)
    try { localStorage.setItem(key, JSON.stringify(cache)) } catch { /* private mode */ }
    listeners.forEach((l) => l())
  }
  const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l) }
  return {
    use: () => useSyncExternalStore(subscribe, read, () => [] as string[]),
    has: (id: string) => read().includes(id),
    toggle: (id: string) => { const cur = read(); write(cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= max ? cur : [...cur, id]) },
    clear: () => write([]),
    max,
  }
}

export const savedPlaces = createLocalList("befo-saved", 50)
export const comparePlaces = createLocalList("befo-compare", 3)

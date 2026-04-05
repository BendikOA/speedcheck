import type { NatureTier } from './speedtiers';

export type UsageNatures = Record<string, NatureTier>; // pokemonId → dominant speed nature
export type UsageOrder  = string[];                    // top-100 IDs in usage order

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── localStorage helpers ───────────────────────────────────────────────────

function lsGet<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return data as T;
  } catch { return null; }
}

function lsSet(key: string, data: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { /* quota */ }
}

// ── In-memory dedup (one fetch per session even if called concurrently) ────

let naturesCache:  UsageNatures | null = null;
let naturesInflight: Promise<UsageNatures> | null = null;

let orderCache:  UsageOrder | null = null;
let orderInflight: Promise<UsageOrder> | null = null;

// ── Public API ─────────────────────────────────────────────────────────────

export async function loadSmogonNatures(): Promise<UsageNatures> {
  if (naturesCache) return naturesCache;
  const stored = lsGet<UsageNatures>('smogon_natures');
  if (stored) { naturesCache = stored; return stored; }
  if (naturesInflight) return naturesInflight;

  naturesInflight = (async (): Promise<UsageNatures> => {
    const res = await fetch('/api/smogon-natures');
    naturesCache = res.ok ? await res.json() : {};
    lsSet('smogon_natures', naturesCache);
    return naturesCache!;
  })();
  return naturesInflight;
}

export async function loadSmogonOrder(): Promise<UsageOrder> {
  if (orderCache) return orderCache;
  const stored = lsGet<UsageOrder>('smogon_order');
  if (stored) { orderCache = stored; return stored; }
  if (orderInflight) return orderInflight;

  orderInflight = (async (): Promise<UsageOrder> => {
    const res = await fetch('/api/smogon-usage');
    orderCache = res.ok ? await res.json() : [];
    lsSet('smogon_order', orderCache);
    return orderCache!;
  })();
  return orderInflight;
}

/** Returns the dominant speed nature for a Pokémon, or null if not in usage data. */
export function getSmogonNature(usageData: UsageNatures, pokemonId: string): NatureTier | null {
  return usageData[pokemonId] ?? null;
}

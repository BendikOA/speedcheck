import type { NatureTier } from './speedtiers';

export type UsageNatures       = Record<string, NatureTier>;
export type UsageOrder         = string[];
export type UsagePriorityMoves = Record<string, string[]>;
export type UsageAbilities     = Record<string, string>;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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

// ── Per-gen in-memory caches ───────────────────────────────────────────────

const naturesCache   = new Map<number, UsageNatures>();
const naturesInflight = new Map<number, Promise<UsageNatures>>();

const orderCache    = new Map<number, UsageOrder>();
const orderInflight  = new Map<number, Promise<UsageOrder>>();

const movesCache    = new Map<number, UsagePriorityMoves>();
const movesInflight  = new Map<number, Promise<UsagePriorityMoves>>();

const abilitiesCache    = new Map<number, UsageAbilities>();
const abilitiesInflight  = new Map<number, Promise<UsageAbilities>>();

// ── Public API ─────────────────────────────────────────────────────────────

export async function loadSmogonNatures(gen = 9): Promise<UsageNatures> {
  if (naturesCache.has(gen)) return naturesCache.get(gen)!;
  const key = `smogon_natures_g${gen}`;
  const stored = lsGet<UsageNatures>(key);
  if (stored) { naturesCache.set(gen, stored); return stored; }
  if (naturesInflight.has(gen)) return naturesInflight.get(gen)!;

  const p = (async (): Promise<UsageNatures> => {
    const res = await fetch(`/api/smogon-natures?gen=${gen}`);
    const data: UsageNatures = res.ok ? await res.json() : {};
    naturesCache.set(gen, data);
    lsSet(key, data);
    return data;
  })();
  naturesInflight.set(gen, p);
  return p;
}

export async function loadSmogonOrder(gen = 9): Promise<UsageOrder> {
  if (orderCache.has(gen)) return orderCache.get(gen)!;
  const key = `smogon_order_g${gen}`;
  const stored = lsGet<UsageOrder>(key);
  if (stored) { orderCache.set(gen, stored); return stored; }
  if (orderInflight.has(gen)) return orderInflight.get(gen)!;

  const p = (async (): Promise<UsageOrder> => {
    const res = await fetch(`/api/smogon-usage?gen=${gen}`);
    const data: UsageOrder = res.ok ? await res.json() : [];
    orderCache.set(gen, data);
    lsSet(key, data);
    return data;
  })();
  orderInflight.set(gen, p);
  return p;
}

export async function loadSmogonPriorityMoves(gen = 9): Promise<UsagePriorityMoves> {
  if (movesCache.has(gen)) return movesCache.get(gen)!;
  const key = `smogon_priority_moves_g${gen}`;
  const stored = lsGet<UsagePriorityMoves>(key);
  if (stored) { movesCache.set(gen, stored); return stored; }
  if (movesInflight.has(gen)) return movesInflight.get(gen)!;

  const p = (async (): Promise<UsagePriorityMoves> => {
    const res = await fetch(`/api/smogon-priority-moves?gen=${gen}`);
    const data: UsagePriorityMoves = res.ok ? await res.json() : {};
    movesCache.set(gen, data);
    lsSet(key, data);
    return data;
  })();
  movesInflight.set(gen, p);
  return p;
}

export async function loadSmogonAbilities(gen = 9): Promise<UsageAbilities> {
  if (abilitiesCache.has(gen)) return abilitiesCache.get(gen)!;
  const key = `smogon_abilities_g${gen}`;
  const stored = lsGet<UsageAbilities>(key);
  if (stored) { abilitiesCache.set(gen, stored); return stored; }
  if (abilitiesInflight.has(gen)) return abilitiesInflight.get(gen)!;

  const p = (async (): Promise<UsageAbilities> => {
    const res = await fetch(`/api/smogon-abilities?gen=${gen}`);
    const data: UsageAbilities = res.ok ? await res.json() : {};
    abilitiesCache.set(gen, data);
    lsSet(key, data);
    return data;
  })();
  abilitiesInflight.set(gen, p);
  return p;
}

/** Returns the dominant speed nature for a Pokémon, or null if not in usage data. */
export function getSmogonNature(usageData: UsageNatures, pokemonId: string): NatureTier | null {
  return usageData[pokemonId] ?? null;
}

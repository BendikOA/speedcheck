import type { NatureTier } from './speedtiers';

export type UsageNatures       = Record<string, NatureTier>;
export type UsageOrder         = string[];
export type UsagePriorityMoves = Record<string, string[]>;
export type UsageAbilities     = Record<string, string>;
export type UsageMoves         = Record<string, string[]>; // top 4 move display names
export type UsageBuilds        = Record<string, { speEV: number; nature: NatureTier; item: string }>;

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

// ── Per-format in-memory caches ────────────────────────────────────────────

const naturesCache    = new Map<string, UsageNatures>();
const naturesInflight = new Map<string, Promise<UsageNatures>>();

const orderCache    = new Map<string, UsageOrder>();
const orderInflight = new Map<string, Promise<UsageOrder>>();

const movesCache    = new Map<string, UsagePriorityMoves>();
const movesInflight = new Map<string, Promise<UsagePriorityMoves>>();

const abilitiesCache    = new Map<string, UsageAbilities>();
const abilitiesInflight = new Map<string, Promise<UsageAbilities>>();

const topMovesCache    = new Map<string, UsageMoves>();
const topMovesInflight = new Map<string, Promise<UsageMoves>>();

const buildsCache    = new Map<string, UsageBuilds>();
const buildsInflight = new Map<string, Promise<UsageBuilds>>();

// ── URL helpers ────────────────────────────────────────────────────────────

function apiUrl(base: string, gen: number, format?: string): string {
  const u = new URL(base, location.origin);
  u.searchParams.set('gen', String(gen));
  if (format) u.searchParams.set('format', format);
  return u.toString();
}

function cacheKey(prefix: string, gen: number, format?: string): string {
  return format ? `${prefix}_${format}` : `${prefix}_g${gen}`;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function loadSmogonNatures(gen = 9, format?: string): Promise<UsageNatures> {
  const k = cacheKey('smogon_natures', gen, format);
  if (naturesCache.has(k)) return naturesCache.get(k)!;
  const stored = lsGet<UsageNatures>(k);
  if (stored) { naturesCache.set(k, stored); return stored; }
  if (naturesInflight.has(k)) return naturesInflight.get(k)!;

  const p = (async (): Promise<UsageNatures> => {
    const res  = await fetch(apiUrl('/api/smogon-natures', gen, format));
    const data: UsageNatures = res.ok ? await res.json() : {};
    naturesCache.set(k, data);
    lsSet(k, data);
    return data;
  })();
  naturesInflight.set(k, p);
  return p;
}

export async function loadSmogonOrder(gen = 9, format?: string): Promise<UsageOrder> {
  const k = cacheKey('smogon_order', gen, format);
  if (orderCache.has(k)) return orderCache.get(k)!;
  const stored = lsGet<UsageOrder>(k);
  if (stored) { orderCache.set(k, stored); return stored; }
  if (orderInflight.has(k)) return orderInflight.get(k)!;

  const p = (async (): Promise<UsageOrder> => {
    const res  = await fetch(apiUrl('/api/smogon-usage', gen, format));
    const data: UsageOrder = res.ok ? await res.json() : [];
    orderCache.set(k, data);
    lsSet(k, data);
    return data;
  })();
  orderInflight.set(k, p);
  return p;
}

export async function loadSmogonPriorityMoves(gen = 9, format?: string): Promise<UsagePriorityMoves> {
  const k = cacheKey('smogon_priority_moves', gen, format);
  if (movesCache.has(k)) return movesCache.get(k)!;
  const stored = lsGet<UsagePriorityMoves>(k);
  if (stored) { movesCache.set(k, stored); return stored; }
  if (movesInflight.has(k)) return movesInflight.get(k)!;

  const p = (async (): Promise<UsagePriorityMoves> => {
    const res  = await fetch(apiUrl('/api/smogon-priority-moves', gen, format));
    const data: UsagePriorityMoves = res.ok ? await res.json() : {};
    movesCache.set(k, data);
    lsSet(k, data);
    return data;
  })();
  movesInflight.set(k, p);
  return p;
}

export async function loadSmogonAbilities(gen = 9, format?: string): Promise<UsageAbilities> {
  const k = cacheKey('smogon_abilities', gen, format);
  if (abilitiesCache.has(k)) return abilitiesCache.get(k)!;
  const stored = lsGet<UsageAbilities>(k);
  if (stored) { abilitiesCache.set(k, stored); return stored; }
  if (abilitiesInflight.has(k)) return abilitiesInflight.get(k)!;

  const p = (async (): Promise<UsageAbilities> => {
    const res  = await fetch(apiUrl('/api/smogon-abilities', gen, format));
    const data: UsageAbilities = res.ok ? await res.json() : {};
    abilitiesCache.set(k, data);
    lsSet(k, data);
    return data;
  })();
  abilitiesInflight.set(k, p);
  return p;
}

export async function loadSmogonMoves(gen = 9, format?: string): Promise<UsageMoves> {
  const k = cacheKey('smogon_moves', gen, format);
  if (topMovesCache.has(k)) return topMovesCache.get(k)!;
  const stored = lsGet<UsageMoves>(k);
  if (stored) { topMovesCache.set(k, stored); return stored; }
  if (topMovesInflight.has(k)) return topMovesInflight.get(k)!;

  const p = (async (): Promise<UsageMoves> => {
    const res  = await fetch(apiUrl('/api/smogon-moves', gen, format));
    const data: UsageMoves = res.ok ? await res.json() : {};
    topMovesCache.set(k, data);
    lsSet(k, data);
    return data;
  })();
  topMovesInflight.set(k, p);
  return p;
}

export async function loadSmogonBuilds(gen = 9, format?: string): Promise<UsageBuilds> {
  const k = cacheKey('smogon_builds', gen, format);
  if (buildsCache.has(k)) return buildsCache.get(k)!;
  const stored = lsGet<UsageBuilds>(k);
  if (stored) { buildsCache.set(k, stored); return stored; }
  if (buildsInflight.has(k)) return buildsInflight.get(k)!;

  const p = (async (): Promise<UsageBuilds> => {
    const res  = await fetch(apiUrl('/api/smogon-builds', gen, format));
    const data: UsageBuilds = res.ok ? await res.json() : {};
    buildsCache.set(k, data);
    lsSet(k, data);
    return data;
  })();
  buildsInflight.set(k, p);
  return p;
}

/** Returns the dominant speed nature for a Pokémon, or null if not in usage data. */
export function getSmogonNature(usageData: UsageNatures, pokemonId: string): NatureTier | null {
  return usageData[pokemonId] ?? null;
}

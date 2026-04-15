import type { NatureTier } from './speedtiers';

export type UsageNatures       = Record<string, NatureTier>;
export type UsageOrder         = string[];
export type UsagePriorityMoves = Record<string, string[]>;
export type UsageAbilities     = Record<string, { name: string; desc: string }>;
export type UsageMoves         = Record<string, string[]>; // top 4 move display names
export type UsageBuilds        = Record<string, { speEV: number; nature: NatureTier; item: string }>;
export type UsageAbilitiesFull = Record<string, Array<{ name: string; pct: number; count: number }>>;
export type UsageMovesFull     = Record<string, Array<{ name: string; pct: number }>>;

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

// ── Champions (Limitless Reg M-A) data ────────────────────────────────────

interface ChampionsPokemon {
  usage:     number;
  moves:     Record<string, number>;
  abilities: Record<string, number>;
  items:     Record<string, number>;
}

interface ChampionsMeta {
  updated: string;
  format:  string;
  meta:    { tournaments: number; teamSlots: number; pokemonCount: number };
  pokemon: Record<string, ChampionsPokemon>;
}

let championsMetaCache:    ChampionsMeta | null = null;
let championsMetaInflight: Promise<ChampionsMeta> | null = null;

async function loadChampionsMeta(): Promise<ChampionsMeta> {
  if (championsMetaCache) return championsMetaCache;
  if (championsMetaInflight) return championsMetaInflight;

  championsMetaInflight = (async () => {
    const res = await fetch('/champions-meta.json');
    const data: ChampionsMeta = res.ok ? await res.json() : { updated: '', format: 'M-A', meta: { tournaments: 0, teamSlots: 0, pokemonCount: 0 }, pokemon: {} };
    championsMetaCache = data;
    return data;
  })();

  return championsMetaInflight;
}

export async function loadChampionsMoves(): Promise<UsageMoves> {
  const meta   = await loadChampionsMeta();
  const result: UsageMoves = {};
  for (const [id, data] of Object.entries(meta.pokemon)) {
    const top4 = Object.keys(data.moves).slice(0, 4);
    if (top4.length) result[id] = top4;
  }
  return result;
}

export async function loadChampionsBuilds(): Promise<UsageBuilds> {
  const meta   = await loadChampionsMeta();
  const result: UsageBuilds = {};
  for (const [id, data] of Object.entries(meta.pokemon)) {
    const topItem = Object.keys(data.items)[0];
    if (topItem) result[id] = { speEV: 0, nature: '=' as import('./speedtiers').NatureTier, item: topItem };
  }
  return result;
}

export async function loadChampionsAbilities(): Promise<UsageAbilities> {
  const meta   = await loadChampionsMeta();
  const result: UsageAbilities = {};
  for (const [id, data] of Object.entries(meta.pokemon)) {
    const entries = Object.entries(data.abilities);
    if (!entries.length) continue;
    const [name, count] = entries[0]; // already sorted desc by scraper
    const pct = Math.round((count / data.usage) * 100);
    result[id] = { name, desc: `Most used in Champions Reg M-A (${pct}% of ${data.usage} teams)` };
  }
  return result;
}

export async function loadChampionsAbilitiesFull(): Promise<UsageAbilitiesFull> {
  const meta   = await loadChampionsMeta();
  const result: UsageAbilitiesFull = {};
  for (const [id, data] of Object.entries(meta.pokemon)) {
    const entries = Object.entries(data.abilities);
    if (!entries.length) continue;
    // Deduplicate by normalized name (raw data has mixed-case duplicates)
    const merged = new Map<string, { name: string; count: number }>();
    for (const [name, count] of entries) {
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = merged.get(key);
      if (existing) {
        existing.count += count;
        // Keep whichever capitalisation has the higher individual count
        if (count > existing.count - count) existing.name = name;
      } else {
        merged.set(key, { name, count });
      }
    }
    result[id] = Array.from(merged.values()).map(({ name, count }) => ({
      name,
      count,
      pct: Math.round((count / data.usage) * 100),
    }));
  }
  return result;
}

/** Aggregate item usage counts across all pokemon → sorted list of item names (most used first). */
export async function loadChampionsItemUsage(): Promise<string[]> {
  const meta = await loadChampionsMeta();
  const totals: Record<string, number> = {};
  for (const data of Object.values(meta.pokemon)) {
    for (const [item, count] of Object.entries(data.items)) {
      totals[item] = (totals[item] ?? 0) + count;
    }
  }
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

export async function loadChampionsMovesFull(): Promise<UsageMovesFull> {
  const meta   = await loadChampionsMeta();
  const result: UsageMovesFull = {};
  for (const [id, data] of Object.entries(meta.pokemon)) {
    const entries = Object.entries(data.moves);
    if (!entries.length) continue;
    result[id] = entries.slice(0, 8).map(([name, count]) => ({
      name,
      pct: Math.round((count / data.usage) * 100),
    }));
  }
  return result;
}

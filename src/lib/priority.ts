/**
 * Priority moves and abilities relevant to VGC speed order.
 * Move users are discovered dynamically from @pkmn/dex learnsets,
 * so the list is complete rather than manually curated.
 */

import { Dex } from '@pkmn/dex';

export interface PriorityMove {
  name: string;
  priority: number;        // +3, +2, +1, -1, -3, etc.
  note?: string;           // e.g. "only on first turn"
  requiresCondition?: string; // key of Conditions — move only works under this condition
}

/** Moves that matter for VGC speed order (priority ≠ 0) */
export const PRIORITY_MOVES: Record<string, PriorityMove> = {
  // +3
  fakeout:          { name: 'Fake Out',         priority: +3, note: 'first turn only' },
  // +2
  extremespeed:     { name: 'Extreme Speed',    priority: +2 },
  firstimpression:  { name: 'First Impression', priority: +2, note: 'first turn only' },
  // +1
  quickattack:      { name: 'Quick Attack',     priority: +1 },
  aquajet:          { name: 'Aqua Jet',         priority: +1 },
  bulletpunch:      { name: 'Bullet Punch',     priority: +1 },
  machpunch:        { name: 'Mach Punch',       priority: +1 },
  shadowsneak:      { name: 'Shadow Sneak',     priority: +1 },
  watershuriken:    { name: 'Water Shuriken',   priority: +1 },
  vacuumwave:       { name: 'Vacuum Wave',      priority: +1 },
  suckerpunch:      { name: 'Sucker Punch',     priority: +1, note: 'fails if target doesn\'t attack' },
  accelerock:       { name: 'Accelerock',       priority: +1 },
  grassyglide:      { name: 'Grassy Glide',     priority: +1, requiresCondition: 'grassy' },
  jetpunch:         { name: 'Jet Punch',        priority: +1 },
};

/** Abilities that affect turn order (not weather-speed boosts, those are in speedtiers.ts) */
export interface PriorityAbility {
  name: string;      // display name
  effect: string;    // short description
}

export const PRIORITY_ABILITIES: Record<string, PriorityAbility> = {
  prankster:    { name: 'Prankster',      effect: 'Status moves get +1 priority' },
  galewings:    { name: 'Gale Wings',     effect: '+1 priority to Flying moves at full HP' },
  triage:       { name: 'Triage',         effect: '+3 priority to healing moves' },
  myceliummight:{ name: 'Mycelium Might', effect: 'Status moves go last but ignore abilities' },
  stall:        { name: 'Stall',          effect: 'Always moves last' },
  truant:       { name: 'Truant',         effect: 'Loafs every other turn' },
  slowstart:    { name: 'Slow Start',     effect: 'Speed and Attack halved for 5 turns' },
};

// ── Dynamic learnset cache ────────────────────────────────────────────────────

/** speciesId → array of priority move IDs that species can learn */
let _cache: Map<string, string[]> | null = null;
let _cachePromise: Promise<void> | null = null;

// Cache key includes a version so stale data is evicted if PRIORITY_MOVES changes.
const LS_KEY     = 'priority_cache_v' + Object.keys(PRIORITY_MOVES).sort().join(',').length;
const LS_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days — only changes with dex updates

function lsLoad(): Map<string, string[]> | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > LS_TTL_MS) { localStorage.removeItem(LS_KEY); return null; }
    return new Map(Object.entries(data));
  } catch { return null; }
}

function lsSave(map: Map<string, string[]>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const data = Object.fromEntries(map);
    localStorage.setItem(LS_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — skip */ }
}

/**
 * Loads the priority move cache by querying @pkmn/dex learnsets.
 * Result is persisted to localStorage (7-day TTL) so subsequent page loads are instant.
 */
export async function loadPriorityCache(): Promise<void> {
  if (_cache) return;

  const stored = lsLoad();
  if (stored) { _cache = stored; return; }

  if (_cachePromise) return _cachePromise;

  _cachePromise = (async () => {
    const moveIds = Object.keys(PRIORITY_MOVES);
    const map = new Map<string, string[]>();

    const allSpecies = [...Dex.species.all()].filter(s => s.exists);

    // Pre-fetch all learnsets (one round-trip; data is in-memory after first load)
    await Promise.all(allSpecies.map(s => Dex.learnsets.get(s.id)));

    for (const sp of allSpecies) {
      // Walk the prevo chain so inherited egg/level moves are included
      const allMoves = new Set<string>();
      let cur: typeof sp | null = sp;
      while (cur?.exists) {
        const ls = await Dex.learnsets.get(cur.id);
        for (const m of Object.keys(ls?.learnset ?? {})) allMoves.add(m);
        cur = cur.prevo ? Dex.species.get(cur.prevo) : null;
      }

      const known = moveIds.filter(id => allMoves.has(id));
      if (known.length > 0) map.set(sp.id, known);
    }

    _cache = map;
    lsSave(_cache);
  })();

  return _cachePromise;
}

/**
 * Returns priority moves for a species. Returns [] if cache not yet loaded.
 * Call loadPriorityCache() on mount to populate.
 */
export function getPriorityMoves(speciesId: string): PriorityMove[] {
  if (!_cache) return [];
  const moveIds = _cache.get(speciesId) ?? [];
  return moveIds.map(id => PRIORITY_MOVES[id]).filter(Boolean);
}

/**
 * Given a list of ability ids (from SpeedEntry.abilities), return any
 * priority-relevant abilities.
 */
export function getPriorityAbilities(abilityIds: string[]): PriorityAbility[] {
  return abilityIds
    .map(id => PRIORITY_ABILITIES[id])
    .filter(Boolean);
}

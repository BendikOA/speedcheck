import type { PageServerLoad } from './$types';
import { Dex } from '@pkmn/dex';
import { getSmogonChaosAllRatings } from '$lib/server/smogonData';

// ── Types ───────────────────────────────────────────────────────────────────

export interface MetaEntryItem {
  name: string;
  count: number;
  pct: number;
  type?: string;
}

export interface SpreadEntry {
  nature: string;
  evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  pct: number;
}

export interface MetaEntry {
  id: string;
  name: string;
  types: string[];
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  usageCount: number;
  usagePct: number;
  moves: MetaEntryItem[];
  items: MetaEntryItem[];
  abilities: MetaEntryItem[];
  teammates: (MetaEntryItem & { id: string })[];
  spreads: SpreadEntry[];
}

export interface MetaPageData {
  entries: MetaEntry[];
  totalTeams: number;
  updated: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Maps base IDs (after stripping Mega suffix) to correct @pkmn/dex IDs.
// Needed for Champions-exclusive megas whose base form has a non-standard dex ID.
const FORM_REMAP: Record<string, string> = {
  'floette': 'floetteeternal',
};

function resolveSpecies(id: string, dex: ReturnType<typeof Dex.forGen>) {
  let s = dex.species.get(id);
  if (s.exists) return { species: s, canonicalId: id };

  // Strip Champions-exclusive mega suffixes (megax / megay / mega)
  const base = id.replace(/mega[xy]?$/, '');
  if (base && base !== id) {
    const mapped = FORM_REMAP[base] ?? base;
    s = dex.species.get(mapped);
    if (s.exists) return { species: s, canonicalId: mapped };
    s = dex.species.get(base);
    if (s.exists) return { species: s, canonicalId: base };
  }

  return null;
}

function parseSpreadKey(key: string): { nature: string; evs: SpreadEntry['evs'] } | null {
  const colon = key.indexOf(':');
  if (colon < 0) return null;
  const parts = key.slice(colon + 1).split('/').map(Number);
  if (parts.length !== 6 || parts.some(isNaN)) return null;
  const [hp, atk, def, spa, spd, spe] = parts;
  return { nature: key.slice(0, colon), evs: { hp, atk, def, spa, spd, spe } };
}

function mergeFractions(
  a: Record<string, number> = {},
  b: Record<string, number> = {},
): Map<string, { sum: number; n: number }> {
  const out = new Map<string, { sum: number; n: number }>();
  for (const [k, v] of Object.entries(a)) out.set(k, { sum: v, n: 1 });
  for (const [k, v] of Object.entries(b)) {
    const ex = out.get(k);
    if (ex) { ex.sum += v; ex.n += 1; } else out.set(k, { sum: v, n: 1 });
  }
  return out;
}

function topItems(
  merged: Map<string, { sum: number; n: number }>,
  combinedRawCount: number,
  limit: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moveDex?: any,
): MetaEntryItem[] {
  return [...merged.entries()]
    .map(([name, { sum, n }]) => ({ name, avg: sum / n }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, limit)
    .map(({ name, avg }) => {
      const pct = Math.round(avg * 100);
      const item: MetaEntryItem = { name, count: Math.round(avg * combinedRawCount), pct };
      if (moveDex) {
        const move = moveDex.get(toId(name));
        if (move?.exists) item.type = move.type as string;
      }
      return item;
    });
}

// ── Load ─────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async (): Promise<MetaPageData> => {
  const [bo1, bo3] = await Promise.all([
    getSmogonChaosAllRatings('gen9championsvgc2026regma'),
    getSmogonChaosAllRatings('gen9championsvgc2026regmabo3'),
  ]);

  const bo1Battles: number = bo1?.info?.['number of battles'] ?? 0;
  const bo3Battles: number = bo3?.info?.['number of battles'] ?? 0;
  const totalTeamSlots = (bo1Battles + bo3Battles) * 2;

  const gen9Dex = Dex.forGen(9);

  // Collect all Pokémon names across both datasets
  const allNames = new Set<string>([
    ...Object.keys(bo1?.data ?? {}),
    ...Object.keys(bo3?.data ?? {}),
  ]);

  // For Champions-exclusive mega forms (not in @pkmn/dex), we resolve to the
  // base species and keep the entry with the highest combined raw count.
  type Candidate = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    species: any;
    canonicalId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bo1Entry: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bo3Entry: any;
    bo1Count: number;
    bo3Count: number;
  };
  const candidates = new Map<string, Candidate>();

  for (const name of allNames) {
    const id = toId(name);
    const resolved = resolveSpecies(id, gen9Dex);
    if (!resolved) continue;

    const { species, canonicalId } = resolved;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bo1Entry = (bo1?.data as any)?.[name];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bo3Entry = (bo3?.data as any)?.[name];
    const bo1Count: number = bo1Entry?.['Raw count'] ?? 0;
    const bo3Count: number = bo3Entry?.['Raw count'] ?? 0;
    const total = bo1Count + bo3Count;

    const existing = candidates.get(canonicalId);
    const existingTotal = existing ? existing.bo1Count + existing.bo3Count : 0;

    if (!existing || total > existingTotal) {
      candidates.set(canonicalId, { species, canonicalId, bo1Entry, bo3Entry, bo1Count, bo3Count });
    }
  }

  const entries: MetaEntry[] = [];

  for (const { species, canonicalId, bo1Entry, bo3Entry, bo1Count, bo3Count } of candidates.values()) {
    const combinedRawCount = bo1Count + bo3Count;
    if (combinedRawCount === 0) continue;

    const usagePct = totalTeamSlots > 0
      ? Math.round((combinedRawCount / totalTeamSlots) * 1000) / 10
      : 0;

    const moves     = topItems(mergeFractions(bo1Entry?.Moves,     bo3Entry?.Moves),     combinedRawCount, 12, gen9Dex.moves);
    const items     = topItems(mergeFractions(bo1Entry?.Items,     bo3Entry?.Items),     combinedRawCount, 12);
    const abilities = topItems(mergeFractions(bo1Entry?.Abilities, bo3Entry?.Abilities), combinedRawCount, 12);

    const mergedSpreads = mergeFractions(bo1Entry?.Spreads, bo3Entry?.Spreads);
    const spreads: SpreadEntry[] = [...mergedSpreads.entries()]
      .map(([key, { sum, n }]) => ({ key, avg: sum / n }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8)
      .flatMap(({ key, avg }) => {
        const parsed = parseSpreadKey(key);
        return parsed ? [{ ...parsed, pct: Math.round(avg * 100) }] : [];
      });

    const mergedTm = mergeFractions(bo1Entry?.Teammates, bo3Entry?.Teammates);
    const teammates = [...mergedTm.entries()]
      .map(([tmName, { sum, n }]) => ({ tmName, avg: sum / n }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)
      .map(({ tmName, avg }) => {
        const tmId = toId(tmName);
        const tmResolved = resolveSpecies(tmId, gen9Dex);
        return {
          id:    tmResolved?.canonicalId ?? tmId,
          name:  tmResolved?.species.name ?? tmName,
          count: Math.round(avg * combinedRawCount),
          pct:   Math.round(avg * 100),
        };
      });

    entries.push({
      id:         canonicalId,
      name:       species.name,
      types:      [...species.types],
      baseStats:  { ...species.baseStats },
      usageCount: combinedRawCount,
      usagePct,
      moves,
      items,
      abilities,
      teammates,
      spreads,
    });
  }

  entries.sort((a, b) => b.usagePct - a.usagePct);

  // Derive updated month: the most recent month Smogon has data for
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const updated = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

  return {
    entries,
    totalTeams: totalTeamSlots,
    updated,
  };
};

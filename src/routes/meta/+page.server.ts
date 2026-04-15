import type { PageServerLoad } from './$types';
import { CHAMPIONS_ROSTER } from '$lib/championsRoster';
import { Dex } from '@pkmn/dex';

// ── Types ───────────────────────────────────────────────────────────────────

export interface MetaEntryItem {
  name: string;
  count: number;
  pct: number;
  type?: string; // move type, populated for moves only
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
}

export interface MetaPageData {
  entries: MetaEntry[];
  totalTeams: number;
  updated: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function sortAndNormalize(
  raw: Record<string, number>,
  usageCount: number,
  limit = 12,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moveDex?: any
): MetaEntryItem[] {
  const merged = new Map<string, number>();
  for (const [key, count] of Object.entries(raw)) {
    const norm = titleCase(key.trim());
    merged.set(norm, (merged.get(norm) ?? 0) + count);
  }
  return [...merged.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => {
      const item: MetaEntryItem = { name, count, pct: Math.round((count / usageCount) * 100) };
      if (moveDex) {
        const move = moveDex.get(name);
        if (move?.exists) item.type = move.type as string;
      }
      return item;
    });
}

// ── Load ─────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ fetch }): Promise<MetaPageData> => {
  const [championsMeta, recentTeams, limitlessTeams] = await Promise.all([
    fetch('/champions-meta.json').then(r => r.json()),
    fetch('/recent-teams.json').then(r => r.json()),
    fetch('/limitless-teams.json').then(r => r.json()),
  ]);

  const totalTeams: number = championsMeta.meta.teamSlots / 6; // ~547

  // ── Teammate co-occurrence ──
  const teammateMap = new Map<string, Map<string, number>>();
  const tmSourceCount = new Map<string, number>();

  const allTournaments = [
    ...(recentTeams.tournaments ?? []),
    ...(limitlessTeams.tournaments ?? []),
  ];

  for (const tournament of allTournaments) {
    for (const team of tournament.teams ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ids: string[] = (team.pokemon ?? []).map((p: any) => p.id as string);
      for (const id of ids) {
        tmSourceCount.set(id, (tmSourceCount.get(id) ?? 0) + 1);
        if (!teammateMap.has(id)) teammateMap.set(id, new Map());
        const map = teammateMap.get(id)!;
        for (const other of ids) {
          if (other !== id) map.set(other, (map.get(other) ?? 0) + 1);
        }
      }
    }
  }

  // ── Build entries ──
  const gen9Dex = Dex.forGen(9);
  const entries: MetaEntry[] = [];

  for (const id of CHAMPIONS_ROSTER) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = (championsMeta.pokemon as any)[id];
    const species = gen9Dex.species.get(id);
    if (!species.exists) continue;

    const usageCount: number = rawData?.usage ?? 0;
    const tmDenominator = tmSourceCount.get(id) ?? 1;
    const tmMap = teammateMap.get(id) ?? new Map<string, number>();

    const teammates = [...tmMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tmId, count]) => {
        const tmSpecies = gen9Dex.species.get(tmId);
        return {
          id: tmId,
          name: tmSpecies.exists ? tmSpecies.name : tmId,
          count,
          pct: Math.round((count / tmDenominator) * 100),
        };
      });

    entries.push({
      id,
      name: species.name,
      types: [...species.types],
      baseStats: { ...species.baseStats },
      usageCount,
      usagePct: Math.round((usageCount / totalTeams) * 1000) / 10,
      moves: rawData ? sortAndNormalize(rawData.moves ?? {}, usageCount, 12, gen9Dex.moves) : [],
      items: rawData ? sortAndNormalize(rawData.items ?? {}, usageCount) : [],
      abilities: rawData ? sortAndNormalize(rawData.abilities ?? {}, usageCount) : [],
      teammates,
    });
  }

  entries.sort((a, b) => b.usageCount - a.usageCount);

  return {
    entries,
    totalTeams: Math.round(totalTeams),
    updated: championsMeta.updated ?? '',
  };
};

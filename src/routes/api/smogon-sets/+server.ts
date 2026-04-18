import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSmogonChaos } from '$lib/server/smogonData';

export interface EvSpread {
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number;
}

export interface PokemonSet {
  label:   string;
  item:    string;
  ability: string;
  nature:  string;
  evs:     EvSpread;
  moves:   string[];
}

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function parseSpread(key: string): { nature: string; evs: EvSpread } | null {
  const colon = key.indexOf(':');
  if (colon < 0) return null;
  const nature = key.slice(0, colon);
  const parts  = key.slice(colon + 1).split('/').map(Number);
  if (parts.length !== 6 || parts.some(isNaN)) return null;
  const [hp, atk, def, spa, spd, spe] = parts;
  return { nature, evs: { hp, atk, def, spa, spd, spe } };
}

function topN<T extends string>(record: Record<T, number>, n: number): T[] {
  return (Object.entries(record) as [T, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export const GET: RequestHandler = async ({ url }) => {
  const gen    = parseInt(url.searchParams.get('gen') ?? '9', 10);
  const format = url.searchParams.get('format') ?? undefined;
  const chaos  = await getSmogonChaos(gen, format);

  const result: Record<string, PokemonSet[]> = {};

  if (chaos?.data) {
    for (const [name, raw] of Object.entries<any>(chaos.data)) {
      const id = toId(name);

      // Top spread
      const spreadKey = topN<string>(raw.Spreads ?? {}, 1)[0];
      const spread = spreadKey ? parseSpread(spreadKey) : null;
      if (!spread) continue;

      // Top ability
      const ability = topN<string>(raw.Abilities ?? {}, 1)[0] ?? '';

      // Top 4 moves
      const moves = topN<string>(raw.Moves ?? {}, 4);
      if (!moves.length) continue;

      // Top 2 items → 2 sets sharing the same spread
      const items = topN<string>(raw.Items ?? {}, 2);
      if (!items.length) continue;

      result[id] = items.map(item => ({
        label:   item,
        item,
        ability,
        nature:  spread.nature,
        evs:     spread.evs,
        moves,
      }));
    }
  }

  return json(result, { headers: { 'Cache-Control': 'public, max-age=86400' } });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSmogonChaos } from '$lib/server/smogonData';
import { PRIORITY_MOVES } from '$lib/priority';

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const PRIORITY_IDS = new Set(Object.keys(PRIORITY_MOVES));

export const GET: RequestHandler = async ({ url }) => {
  const gen    = parseInt(url.searchParams.get('gen') ?? '9', 10);
  const format = url.searchParams.get('format') ?? undefined;
  const chaos  = await getSmogonChaos(gen, format);
  const result: Record<string, string[]> = {};

  if (chaos?.data) {
    for (const [name, entry] of Object.entries<any>(chaos.data)) {
      if (!entry.Moves) continue;
      // Keep only priority moves that appear with any usage, sorted by usage desc
      const used = Object.entries<number>(entry.Moves)
        .filter(([move]) => PRIORITY_IDS.has(toId(move)))
        .sort((a, b) => b[1] - a[1])
        .map(([move]) => toId(move));
      if (used.length) result[toId(name)] = used;
    }
  }

  return json(result, { headers: { 'Cache-Control': 'public, max-age=86400' } });
};

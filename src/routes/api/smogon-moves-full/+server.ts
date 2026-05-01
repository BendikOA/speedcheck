import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSmogonChaos } from '$lib/server/smogonData';

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const GET: RequestHandler = async ({ url }) => {
  const gen    = parseInt(url.searchParams.get('gen') ?? '9', 10);
  const format = url.searchParams.get('format') ?? undefined;
  const chaos  = await getSmogonChaos(gen, format);
  const result: Record<string, Array<{ name: string; pct: number }>> = {};

  if (chaos?.data) {
    for (const [name, entry] of Object.entries<any>(chaos.data)) {
      if (!entry.Moves) continue;
      const top = Object.entries<number>(entry.Moves)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([move, frac]) => ({ name: move, pct: Math.round(frac * 100) }));
      if (top.length) result[toId(name)] = top;
    }
  }

  return json(result, { headers: { 'Cache-Control': 'public, max-age=86400' } });
};

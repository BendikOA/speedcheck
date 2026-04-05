import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSmogonChaos } from '$lib/server/smogonData';

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const GET: RequestHandler = async ({ url }) => {
  const gen    = parseInt(url.searchParams.get('gen') ?? '9', 10);
  const format = url.searchParams.get('format') ?? undefined;
  const chaos  = await getSmogonChaos(gen, format);
  // Returns the top ability ID per Pokémon by usage count
  const result: Record<string, string> = {};

  if (chaos?.data) {
    for (const [name, entry] of Object.entries<any>(chaos.data)) {
      if (!entry.Abilities) continue;
      const top = Object.entries<number>(entry.Abilities)
        .sort((a, b) => b[1] - a[1])[0];
      if (top) result[toId(name)] = toId(top[0]);
    }
  }

  return json(result, { headers: { 'Cache-Control': 'public, max-age=86400' } });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { NatureTier } from '$lib/speedtiers';
import { getSmogonChaos } from '$lib/server/smogonData';

const PLUS_SPE  = new Set(['timid', 'jolly', 'naive', 'hasty']);
const MINUS_SPE = new Set(['brave', 'quiet', 'relaxed', 'sassy']);

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function dominantNature(spreads: Record<string, number>): NatureTier {
  let plus = 0, minus = 0, neutral = 0;
  for (const [key, count] of Object.entries(spreads)) {
    const nature = key.split(':')[0].toLowerCase();
    if (PLUS_SPE.has(nature))       plus    += count;
    else if (MINUS_SPE.has(nature)) minus   += count;
    else                            neutral += count;
  }
  if (plus >= minus && plus >= neutral)  return '+';
  if (minus >= plus && minus >= neutral) return '-';
  return '=';
}

export const GET: RequestHandler = async ({ url }) => {
  const gen    = parseInt(url.searchParams.get('gen') ?? '9', 10);
  const format = url.searchParams.get('format') ?? undefined;
  const chaos  = await getSmogonChaos(gen, format);
  const result: Record<string, NatureTier> = {};

  if (chaos?.data) {
    for (const [name, entry] of Object.entries<any>(chaos.data)) {
      if (entry.Spreads && Object.keys(entry.Spreads).length > 0) {
        result[toId(name)] = dominantNature(entry.Spreads);
      }
    }
  }

  return json(result, {
    headers: { 'Cache-Control': 'public, max-age=86400' }
  });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { NatureTier } from '$lib/speedtiers';
import { getSmogonChaos } from '$lib/server/smogonData';

const PLUS_SPE  = new Set(['timid', 'jolly', 'naive', 'hasty']);
const MINUS_SPE = new Set(['brave', 'quiet', 'relaxed', 'sassy']);

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export type BuildEntry = { speEV: number; nature: NatureTier; item: string };

function parseSpread(key: string): { nature: NatureTier; speEV: number } | null {
  // Format: "Timid:0/0/4/252/0/252"
  const colonIdx = key.indexOf(':');
  if (colonIdx < 0) return null;
  const natureName = key.slice(0, colonIdx).toLowerCase();
  const evParts    = key.slice(colonIdx + 1).split('/');
  if (evParts.length < 6) return null;
  const speEV = parseInt(evParts[5], 10);
  if (isNaN(speEV)) return null;
  const nature: NatureTier = PLUS_SPE.has(natureName) ? '+' : MINUS_SPE.has(natureName) ? '-' : '=';
  return { nature, speEV };
}

export const GET: RequestHandler = async ({ url }) => {
  const gen    = parseInt(url.searchParams.get('gen') ?? '9', 10);
  const format = url.searchParams.get('format') ?? undefined;
  const chaos  = await getSmogonChaos(gen, format);

  const result: Record<string, BuildEntry> = {};

  if (chaos?.data) {
    for (const [name, entry] of Object.entries<any>(chaos.data)) {
      const id = toId(name);

      // Top spread (nature + Spe EV)
      let spreadData: { nature: NatureTier; speEV: number } | null = null;
      if (entry.Spreads) {
        const topKey = Object.entries<number>(entry.Spreads)
          .sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topKey) spreadData = parseSpread(topKey);
      }

      // Top item
      let item = '';
      if (entry.Items) {
        item = Object.entries<number>(entry.Items)
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      }

      if (spreadData || item) {
        result[id] = {
          speEV:  spreadData?.speEV  ?? 252,
          nature: spreadData?.nature ?? '=',
          item,
        };
      }
    }
  }

  return json(result, { headers: { 'Cache-Control': 'public, max-age=86400' } });
};

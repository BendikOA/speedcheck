import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSmogonChaos } from '$lib/server/smogonData';

export const GET: RequestHandler = async ({ url }) => {
  const gen    = parseInt(url.searchParams.get('gen') ?? '9', 10);
  const format = url.searchParams.get('format') ?? undefined;
  const chaos  = await getSmogonChaos(gen, format);
  const totals: Record<string, number> = {};

  if (chaos?.data) {
    for (const entry of Object.values<any>(chaos.data)) {
      if (!entry.Items) continue;
      const rawCount: number = entry['Raw count'] ?? 1;
      for (const [item, frac] of Object.entries<number>(entry.Items)) {
        totals[item] = (totals[item] ?? 0) + frac * rawCount;
      }
    }
  }

  const sorted = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  return json(sorted, { headers: { 'Cache-Control': 'public, max-age=86400' } });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSmogonChaos } from '$lib/server/smogonData';

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const GET: RequestHandler = async () => {
  const chaos = await getSmogonChaos();

  const ranked: { id: string; count: number }[] = [];

  if (chaos?.data) {
    for (const [name, entry] of Object.entries<any>(chaos.data)) {
      const count = entry['Raw count'] ?? 0;
      if (count > 0) ranked.push({ id: toId(name), count });
    }
  }

  ranked.sort((a, b) => b.count - a.count);

  // Return top 100 IDs in order
  const top100 = ranked.slice(0, 100).map(r => r.id);

  return json(top100, {
    headers: { 'Cache-Control': 'public, max-age=86400' }
  });
};

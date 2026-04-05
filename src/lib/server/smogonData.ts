// Server-only module — fetches & caches Smogon chaos JSON

const VGC_FORMATS = [
  'gen9vgc2026regi',
  'gen9vgc2026regibo3',
  'gen9vgc2026regf',
  'gen9vgc2026regfbo3',
  'gen9vgc2025regg',
];

let cached: any = null;
let fetchedAt = 0;
const TTL_MS = 6 * 60 * 60 * 1000; // re-fetch after 6 hours

async function tryFetch(format: string): Promise<any | null> {
  const now = new Date();
  for (let lag = 1; lag <= 4; lag++) {
    const d = new Date(now.getFullYear(), now.getMonth() - lag, 1);
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const url   = `https://www.smogon.com/stats/${year}-${month}/chaos/${format}-0.json`;
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* try next */ }
  }
  return null;
}

export async function getSmogonChaos(): Promise<any | null> {
  const now = Date.now();
  if (cached && (now - fetchedAt) < TTL_MS) return cached;

  for (const format of VGC_FORMATS) {
    const data = await tryFetch(format);
    if (data) {
      cached    = data;
      fetchedAt = now;
      return data;
    }
  }
  return null;
}

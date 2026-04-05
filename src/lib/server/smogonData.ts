// Server-only module — fetches & caches Smogon chaos JSON, keyed by gen

// Formats + known month ranges per gen.
// months: explicit list to try; empty = try last 6 rolling months.
const GEN_SEARCH: Record<number, { formats: string[]; months?: string[] }> = {
  9: {
    formats: ['gen9vgc2026regi', 'gen9vgc2026regibo3', 'gen9vgc2026regf', 'gen9vgc2026regfbo3', 'gen9vgc2025regg'],
  },
  8: {
    formats: ['gen8vgc2022', 'gen8vgc2021series10', 'gen8vgc2021series9', 'gen8vgc2021', 'gen8vgc2020'],
    months: ['2022-11','2022-10','2022-09','2022-08','2022-07','2022-06',
             '2022-05','2022-04','2022-03','2022-02','2022-01',
             '2021-12','2021-11','2021-10','2021-09'],
  },
  7: {
    formats: ['gen7vgc2019', 'gen7vgc2019ultraseries', 'gen7vgc2019sunseries', 'gen7vgc2018', 'gen7vgc2017'],
    months: ['2019-11','2019-10','2019-09','2019-08','2019-07','2019-06',
             '2019-05','2019-04','2019-03','2019-02','2019-01',
             '2018-12','2018-11','2018-10'],
  },
  6: {
    formats: ['gen6vgc2016', 'gen6vgc2015', 'gen6battlespotdoubles'],
    months: ['2016-11','2016-10','2016-09','2016-08','2016-07','2016-06',
             '2016-05','2016-04','2016-03','2016-02','2016-01',
             '2015-12','2015-11'],
  },
};

const TTL_MS = 24 * 60 * 60 * 1000;

// Per-gen cache
const cacheMap   = new Map<number, any>();
const fetchedMap = new Map<number, number>();

function rollingMonths(count = 6): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let lag = 1; lag <= count; lag++) {
    const d = new Date(now.getFullYear(), now.getMonth() - lag, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

async function tryFetch(format: string, months: string[]): Promise<any | null> {
  for (const ym of months) {
    const url = `https://www.smogon.com/stats/${ym}/chaos/${format}-0.json`;
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* try next */ }
  }
  return null;
}

export async function getSmogonChaos(gen = 9): Promise<any | null> {
  const now = Date.now();
  if (cacheMap.has(gen) && (now - (fetchedMap.get(gen) ?? 0)) < TTL_MS) {
    return cacheMap.get(gen);
  }

  const search = GEN_SEARCH[gen];
  if (!search) return null;

  const months = search.months ?? rollingMonths(6);

  for (const format of search.formats) {
    const data = await tryFetch(format, months);
    if (data) {
      cacheMap.set(gen, data);
      fetchedMap.set(gen, now);
      return data;
    }
  }
  return null;
}

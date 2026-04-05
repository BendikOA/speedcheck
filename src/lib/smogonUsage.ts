import type { NatureTier } from './speedtiers';

export type UsageNatures = Record<string, NatureTier>; // pokemonId → dominant speed nature

let cache: UsageNatures | null = null;
let inflight: Promise<UsageNatures> | null = null;

/**
 * Fetches dominant speed natures via our server endpoint (which proxies Smogon
 * to avoid CORS and always picks the latest available format/month).
 */
export async function loadSmogonNatures(): Promise<UsageNatures> {
  if (cache)    return cache;
  if (inflight) return inflight;

  inflight = (async (): Promise<UsageNatures> => {
    const res = await fetch('/api/smogon-natures');
    cache = res.ok ? await res.json() : {};
    return cache!;
  })();

  return inflight;
}

/** Returns the dominant speed nature for a Pokémon, or null if not in usage data. */
export function getSmogonNature(usageData: UsageNatures, pokemonId: string): NatureTier | null {
  return usageData[pokemonId] ?? null;
}

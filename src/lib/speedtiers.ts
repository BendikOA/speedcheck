import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

const gens = new Generations(Dex);

export const GEN_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type GenNumber = typeof GEN_NUMBERS[number];

const NATURES_EXIST: Record<number, boolean> = { 1: false, 2: false };

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export interface SpeedEntry {
  id: string;
  name: string;
  baseSpe: number;
  maxSpeed: number;
  minSpeed: number;
  neutralSpeed: number;
  abilities: string[]; // ability ids, e.g. ['swiftswim', 'waterabsorb']
}

// Abilities that double speed in a specific field condition
export const WEATHER_ABILITY: Record<string, 'rain' | 'sun' | 'sand' | 'snow' | 'electric'> = {
  swiftswim:   'rain',
  chlorophyll: 'sun',
  sandrush:    'sand',
  slushrush:   'snow',
  surgesurfer: 'electric',
};

const cache    = new Map<number, SpeedEntry[]>();
const cacheAll = new Map<number, SpeedEntry[]>();

// Formes that add no unique speed value (cosmetic / Gmax / Totem)
const SKIP_SUFFIX = ['-Gmax', '-Totem', '-Low-Key-Gmax', '-Rapid-Strike-Gmax'];
const SKIP_NS     = new Set(['CAP', 'LGPE', 'Pokestar', 'Custom']);

function isMeaningfulForme(name: string, ns: string | null): boolean {
  if (ns && SKIP_NS.has(ns)) return false;
  if (SKIP_SUFFIX.some(s => name.endsWith(s))) return false;
  return true;
}

function calcEntries(species: Iterable<any>, genNum: GenNumber): SpeedEntry[] {
  const gen = gens.get(genNum);
  const hasNatures = NATURES_EXIST[genNum] !== false;
  const jolly = hasNatures ? gen.natures.get('jolly')! : gen.natures.get('hardy')!;
  const brave = hasNatures ? gen.natures.get('brave')! : gen.natures.get('hardy')!;
  const hardy = gen.natures.get('hardy')!;

  const entries: SpeedEntry[] = [];
  for (const sp of species) {
    if (!sp.exists) continue;
    if (!isMeaningfulForme(sp.name, sp.isNonstandard)) continue;

    const baseSpe = sp.baseStats.spe;
    const abilities = Object.values(sp.abilities)
      .filter(Boolean)
      .map((n: any) => toId(n as string));

    entries.push({
      id: sp.id, name: sp.name, baseSpe, abilities,
      maxSpeed:     gen.stats.calc('spe', baseSpe, 31, 252, 50, jolly),
      minSpeed:     gen.stats.calc('spe', baseSpe,  0,   0, 50, brave),
      neutralSpeed: gen.stats.calc('spe', baseSpe, 31, 252, 50, hardy),
    });
  }
  entries.sort((a, b) => b.maxSpeed - a.maxSpeed || b.baseSpe - a.baseSpe);
  return entries;
}

/** Gen-filtered list — for team builder (only Pokémon legal in that gen's format) */
export function buildSpeedTiers(genNum: GenNumber): SpeedEntry[] {
  if (cache.has(genNum)) return cache.get(genNum)!;
  const gen = gens.get(genNum);
  const entries = calcEntries(gen.species, genNum);
  cache.set(genNum, entries);
  return entries;
}

/** Full national dex list — for the tiers reference page */
export function buildAllTiers(genNum: GenNumber): SpeedEntry[] {
  if (cacheAll.has(genNum)) return cacheAll.get(genNum)!;
  const entries = calcEntries(Dex.species.all(), genNum);
  cacheAll.set(genNum, entries);
  return entries;
}


export type Conditions = {
  yourTailwind: boolean;
  oppTailwind:  boolean;
  trickRoom:    boolean;
  rain:         boolean;
  sun:          boolean;
  sand:         boolean;
  snow:         boolean;
  electric:     boolean;
  grassy:       boolean;
  psychic:      boolean;
};

// Per-pokemon flags stored outside Conditions (keyed by "you-0", "opp-2", etc.)
export type PerPokemon = {
  scarf:     boolean;
  paralysis: boolean;
};

export const DEFAULT_CONDITIONS: Conditions = {
  yourTailwind: false, oppTailwind: false, trickRoom: false,
  rain: false, sun: false, sand: false, snow: false, electric: false, grassy: false, psychic: false,
};

export function calcEffectiveSpeed(
  entry: SpeedEntry,
  side: 'you' | 'opp',
  perPoke: { scarf: boolean; paralysis: boolean },
  cond: Conditions
): number {
  let speed = entry.maxSpeed;

  // Weather/terrain ability (×2)
  for (const abilityId of entry.abilities) {
    const trigger = WEATHER_ABILITY[abilityId];
    if (trigger && cond[trigger]) {
      speed = Math.floor(speed * 2);
      break;
    }
  }

  // Scarf ×1.5
  if (perPoke.scarf) speed = Math.floor(speed * 1.5);

  // Tailwind ×2
  const tailwind = side === 'you' ? cond.yourTailwind : cond.oppTailwind;
  if (tailwind) speed = Math.floor(speed * 2);

  // Paralysis ×0.5
  if (perPoke.paralysis) speed = Math.floor(speed * 0.5);

  return speed;
}

export function applyModifiers(speed: number, options: {
  scarf?: boolean;
  tailwind?: boolean;
  paralysis?: boolean;
}): number {
  let s = speed;
  if (options.scarf) s = Math.floor(s * 1.5);
  if (options.tailwind) s = Math.floor(s * 2);
  if (options.paralysis) s = Math.floor(s * 0.5);
  return s;
}

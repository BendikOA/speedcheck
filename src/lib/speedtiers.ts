import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';
import { getLZAMegas } from './lzaMegas';

const gens = new Generations(Dex);

export const GEN_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type GenNumber = typeof GEN_NUMBERS[number];

const NATURES_EXIST: Record<number, boolean> = { 1: false, 2: false };

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export interface MegaStats {
  id: string;
  name: string;
  baseSpe: number;
  maxSpeed: number;
  neutralSpeed: number;
  minSpeed: number;
  types: string[];
}

export interface SpeedEntry {
  id: string;
  name: string;
  baseSpe: number;
  maxSpeed: number;
  minSpeed: number;
  neutralSpeed: number;
  abilities: string[]; // ability ids, e.g. ['swiftswim', 'waterabsorb']
  types: string[];     // e.g. ['Water', 'Flying']
  megaForms: MegaStats[]; // all available mega forms (0 = none, 1 = one mega, 2 = X+Y)
}

// Abilities that double speed in a specific field condition
export const WEATHER_ABILITY: Record<string, 'rain' | 'sun' | 'sand' | 'snow' | 'electric'> = {
  swiftswim:   'rain',
  chlorophyll: 'sun',
  sandrush:    'sand',
  slushrush:   'snow',
  surgesurfer: 'electric',
};

/** Speed-boosting moves: moveId → speed stages gained (+1 = ×1.5, +2 = ×2.0) */
export const SPEED_BOOST_MOVES: Record<string, { stages: number; label: string }> = {
  dragondance:  { stages: 1, label: 'Dragon Dance' },
  quiverdance:  { stages: 1, label: 'Quiver Dance' },
  flamecharge:  { stages: 1, label: 'Flame Charge' },
  agility:      { stages: 2, label: 'Agility'      },
  rockpolish:   { stages: 2, label: 'Rock Polish'  },
  shiftgear:    { stages: 2, label: 'Shift Gear'   },
  autotomize:   { stages: 2, label: 'Autotomize'   },
  tailglow:     { stages: 0, label: 'Tail Glow'    }, // SpA only — excluded from speed calc
};

// Abilities that give ×1.5 speed when Speed is the boosted stat (proto/quark)
export const PROTO_ABILITY: Record<string, 'sun' | 'electric'> = {
  protosynthesis: 'sun',
  quarkdrive:     'electric',
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
    const types: string[] = sp.types ?? [];

    // Collect all available mega forms (order: X before Y if both exist)
    const megaForms: MegaStats[] = [];
    for (const suffix of ['mega', 'megax', 'megay']) {
      const megaSp = Dex.species.get(`${sp.id}${suffix}`);
      if (megaSp?.exists) {
        const megaSpe = megaSp.baseStats.spe;
        megaForms.push({
          id: megaSp.id,
          name: megaSp.name,
          baseSpe: megaSpe,
          types: megaSp.types ?? types,
          maxSpeed:     gen.stats.calc('spe', megaSpe, 31, 252, 50, jolly),
          neutralSpeed: gen.stats.calc('spe', megaSpe, 31,   0, 50, hardy),
          minSpeed:     gen.stats.calc('spe', megaSpe, 31,   0, 50, brave),
        });
      }
    }

    // Merge any LZA megas not yet in the dex
    for (const lza of getLZAMegas(sp.id)) {
      if (!megaForms.some(m => m.id === lza.id)) megaForms.push(lza);
    }

    entries.push({
      id: sp.id, name: sp.name, baseSpe, abilities, types, megaForms,
      maxSpeed:     gen.stats.calc('spe', baseSpe, 31, 252, 50, jolly),
      neutralSpeed: gen.stats.calc('spe', baseSpe, 31,   0, 50, hardy),
      minSpeed:     gen.stats.calc('spe', baseSpe, 31,   0, 50, brave),
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

export const DEFAULT_CONDITIONS: Conditions = {
  yourTailwind: false, oppTailwind: false, trickRoom: false,
  rain: false, sun: false, sand: false, snow: false, electric: false, grassy: false, psychic: false,
};

export type NatureTier = '+' | '=' | '-';

/** Compute raw speed stat from base, EVs (0-252), IVs=31, Level=50. */
export function calcRawSpeed(baseSpe: number, ev: number, natureTier: NatureTier): number {
  const raw = Math.floor((2 * baseSpe + 31 + Math.floor(ev / 4)) * 50 / 100 + 5);
  if (natureTier === '+') return Math.floor(raw * 1.1);
  if (natureTier === '-') return Math.floor(raw * 0.9);
  return raw;
}

export function calcEffectiveSpeed(
  entry: SpeedEntry,
  side: 'you' | 'opp',
  perPoke: {
    scarf:           boolean;
    paralysis:       boolean;
    protoBoost?:     boolean;
    commander?:      boolean;
    natureTier?:     NatureTier;
    megaIndex?:      number; // 0 = base, 1+ = mega form index into megaForms[]
    speedBoostStage?: number; // +1 = ×1.5, +2 = ×2.0
    speedEV?:        number; // when set, compute speed from EVs instead of precomputed values
  },
  cond: Conditions
): number {
  // Pick stat source: mega forme if toggled
  const megaIdx = perPoke.megaIndex ?? 0;
  const src = (megaIdx > 0 && entry.megaForms[megaIdx - 1]) ? entry.megaForms[megaIdx - 1] : entry;

  // Pick base speed — use EV-aware calc when speedEV is specified, else precomputed tiers
  const base = perPoke.speedEV !== undefined
    ? calcRawSpeed(src.baseSpe, perPoke.speedEV, perPoke.natureTier ?? '=')
    : perPoke.natureTier === '=' ? src.neutralSpeed
    : perPoke.natureTier === '-' ? src.minSpeed
    : src.maxSpeed;
  let speed = base;

  // Weather/terrain ability (×2) — skip when mega'd (mega has different ability)
  if (!megaIdx) {
    for (const abilityId of entry.abilities) {
      const trigger = WEATHER_ABILITY[abilityId];
      if (trigger && cond[trigger]) {
        speed = Math.floor(speed * 2);
        break;
      }
    }
  }

  // Speed boost stages from Dragon Dance, Agility, etc. — (2+n)/2 multiplier
  if (perPoke.speedBoostStage && perPoke.speedBoostStage > 0)
    speed = Math.floor(speed * (2 + perPoke.speedBoostStage) / 2);

  // Protosynthesis / Quark Drive speed boost (×1.5, only when Speed is boosted stat)
  if (perPoke.protoBoost) speed = Math.floor(speed * 1.5);

  // Commander (Dondozo + Tatsugiri): +2 speed stages = ×2
  if (perPoke.commander) speed = Math.floor(speed * 2);

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

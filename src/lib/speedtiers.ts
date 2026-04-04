import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

const gens = new Generations(Dex);

export const GEN_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type GenNumber = typeof GEN_NUMBERS[number];

// Natures don't exist in Gen 1-2; Speed calc still works but natures are neutral
const NATURES_EXIST: Record<number, boolean> = { 1: false, 2: false };

export interface SpeedEntry {
  name: string;
  baseSpe: number;
  maxSpeed: number;    // +spe nature (or neutral pre-gen3), 31 IV, 252 EVs
  minSpeed: number;    // -spe nature (or neutral pre-gen3), 0 IV, 0 EVs
  neutralSpeed: number; // neutral nature, 31 IV, 252 EVs
}

export function buildSpeedTiers(genNum: GenNumber): SpeedEntry[] {
  const gen = gens.get(genNum);

  const hasNatures = NATURES_EXIST[genNum] !== false;
  const jolly = hasNatures ? gen.natures.get('jolly')! : gen.natures.get('hardy')!;
  const brave = hasNatures ? gen.natures.get('brave')! : gen.natures.get('hardy')!;
  const hardy = gen.natures.get('hardy')!;

  const entries: SpeedEntry[] = [];

  for (const species of gen.species) {
    if (species.isNonstandard) continue;
    if (!species.exists) continue;

    const baseSpe = species.baseStats.spe;

    entries.push({
      name: species.name,
      baseSpe,
      maxSpeed: gen.stats.calc('spe', baseSpe, 31, 252, 50, jolly),
      minSpeed: gen.stats.calc('spe', baseSpe, 0, 0, 50, brave),
      neutralSpeed: gen.stats.calc('spe', baseSpe, 31, 252, 50, hardy)
    });
  }

  entries.sort((a, b) => b.maxSpeed - a.maxSpeed || b.baseSpe - a.baseSpe);

  return entries;
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
